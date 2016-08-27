{
    const: {
        UP: 'up',
        DOWN: 'down',
        EVENTS: {
            DOWN_BUTTON_PRESSED: 'down_button_pressed',
            UP_BUTTON_PRESSED: 'up_button_pressed',
            FLOOR_BUTTON_PRESSED: 'floor_button_pressed',
            IDLE: 'idle',
            PASSING_FLOOR: 'passing_floor',
            STOPPED_AT_FLOOR: 'stopped_at_floor'
        },
        LOADSTAT: {
            '4': 0.65,
            '5' : 0.65,
            '6' : 0.65,
            '10': 0.6
        }
    },

    manager: {},


    floorsPrototype : {},

    floors: [],

    init: function(elevators, floors) {

        var that = this;
        var elevators2 = elevators;


        this.floorsPrototype = ( function(floors) { 
            var _floors = floors;

            return {

                isClicked: function(level, direction) {
                    return (_floors[level]['buttonStates'][direction].length > 0);
                },

                getNearFloor: function( level ) {
                    
                    var clickedFloors = _floors.filter(function(item) {
                        return ( ( item['buttonStates'][that.const.UP].length > 0 ) || ( item['buttonStates'][that.const.DOWN].length > 0  ) )
                    });

                    if (clickedFloors.length) {

                        var arrDistance = clickedFloors.map(function(item) {
                            return ({
                                floor: item.level,
                                distance: Math.abs( item.level - level )
                            })
                        });

                        arrDistance = arrDistance.sort(function(a, b) {
                            return a.distance - b.distance;
                        })

                        return arrDistance[0];
                    }

                    return null;

                }
            }

        }).call(this, floors);
        


        this.manager = (function(elevators) {

            var _elevators = elevators;

            var getFreeElevator = function( elevators, floorNum, direction ) {

                var freeElev = [];
                
                elevators.map(function(item) {
                    if ( item.destinationQueue.length === 0 ) {
                        freeElev.push(item);
                    }
                });

                if ( freeElev.length ) {

                    freeElev = freeElev.sort( function (a, b) {
                        return Math.abs( a.currentFloor() - floorNum ) - Math.abs( b.currentFloor() - floorNum );
                    } );

                    return freeElev[0];
                };

                return null;

            };


            var IsHaveEmptyPlaces = function( elevator ) {

                if (! that.const.LOADSTAT[elevator.maxPassengerCount().toString()] ) throw new Error("don't have const LOADSTAT for " + elevator.maxPassengerCount() +  " passenger")

                return elevator.loadFactor() <  that.const.LOADSTAT[ elevator.maxPassengerCount().toString() ]
            }

            var availableElevator = function( elevator, floor, direction ) {
                var isAvailable = false;
                _elevators.map( function( item, key ) {
                    if ( item === elevator ) {
                        return;
                    }

                    if ( item.currentFloor() === floor ) {
                        if ( ( direction == that.const.UP && item.goingUpIndicator() ) || 
                            ( direction == that.const.DOWN && item.goingDownIndicator() ) ) {
                            console.log(key);
                            isAvailable = true;
                        }
                    }
                } );

                return isAvailable;
            }

            return {
                triggerEvent: (function(evType, params) {
                    switch(evType) {
                        

                        case this.const.EVENTS.DOWN_BUTTON_PRESSED:

                            var freeElevator = getFreeElevator(_elevators, params.level, that.const.DOWN);
                            
                            if ( freeElevator ) {
                                freeElevator.goToFloor(params.level);
                            }

                            break;

                        
                        case this.const.EVENTS.UP_BUTTON_PRESSED:

                            var freeElevator = getFreeElevator(_elevators, params.level, that.const.UP);
                            
                            if ( freeElevator ) {
                                freeElevator.goToFloor(params.level);
                            }

                            break;

                        
                        case this.const.EVENTS.FLOOR_BUTTON_PRESSED:

                            params.owner.destinationQueue.push( params.floor );
                        
                            if ( params.owner.currentFloor() > params.floor ) {

                                params.owner.goingDownIndicator(true);
                                params.owner.goingUpIndicator(false);

                                params.owner.destinationQueue = params.owner.destinationQueue.sort(function(a, b) {
                                    return b - a;
                                });
                        
                            } else {

                                params.owner.goingDownIndicator(false);
                                params.owner.goingUpIndicator(true);

                                params.owner.destinationQueue = params.owner.destinationQueue.sort(function(a, b) {
                                    return a - b;
                                });
                            };

                            params.owner.checkDestinationQueue()

                            break;


                        case this.const.EVENTS.STOPPED_AT_FLOOR:

                            var pressedButtons = params.owner.getPressedFloors();

                            var newDestQueue = [];
                            params.owner.destinationQueue.map((function(item) {
                                
                                var canAddToQueue = false;
                                
                                if ( pressedButtons.indexOf(item) !== -1 ) {
                                    canAddToQueue = true;
                                }

                                if ( this.floorsPrototype.isClicked(item, this.const.UP) || this.floorsPrototype.isClicked(item, this.const.DOWN) ) {
                                    canAddToQueue = true;
                                }

                                if ( canAddToQueue ) newDestQueue.push( item );

                            }).bind(this));

                            params.owner.destinationQueue = newDestQueue;
                            params.owner.checkDestinationQueue();



                            if (params.owner.destinationQueue.length) {

                                if (params.owner.destinationQueue[0] < params.floor) {
                                    params.owner.goingDownIndicator(true);
                                    params.owner.goingUpIndicator(false);
                                }
                                else {
                                    params.owner.goingDownIndicator(false);
                                    params.owner.goingUpIndicator(true);
                                }


                            }
                            else { // is empty 
                                params.owner.goingDownIndicator(true);
                                params.owner.goingUpIndicator(true);

                                var nearFloor = this.floorsPrototype.getNearFloor(params.floor);
                                
                                if (nearFloor != null ) {
                                    params.owner.goToFloor(nearFloor.floor);
                                }
                                
                            }

                            break;

                        case this.const.EVENTS.PASSING_FLOOR:

                            var stopAtThisFloor = false;


                            if ( IsHaveEmptyPlaces( params.owner ) ) {
                                stopAtThisFloor = stopAtThisFloor || this.floorsPrototype.isClicked( params.floor, params.direction );
                            }

                            stopAtThisFloor = stopAtThisFloor || (params.owner.getPressedFloors().indexOf(params.floor) !== -1);

                            stopAtThisFloor = stopAtThisFloor && (!availableElevator( params.owner,  params.floor, params.direction ));


                            if ( stopAtThisFloor ) {
                                params.owner.goToFloor(params.floor, true);
                            }

                            break;

                    }
                }).bind(this)
            }
        }).call(this, elevators2);

        var that = this;
        floors.map(function(item) {

            item.on(that.const.EVENTS.DOWN_BUTTON_PRESSED, function() {
                that.manager.triggerEvent(that.const.EVENTS.DOWN_BUTTON_PRESSED, {
                    level: this.level
                });
            });

            item.on(that.const.EVENTS.UP_BUTTON_PRESSED, function() {
                that.manager.triggerEvent(that.const.EVENTS.UP_BUTTON_PRESSED, {
                    level: this.level
                });
            });

        });

        elevators2.map(function(item) {

            item.on(that.const.EVENTS.FLOOR_BUTTON_PRESSED, function(floorNum) {
                that.manager.triggerEvent( that.const.EVENTS.FLOOR_BUTTON_PRESSED, {
                    floor: floorNum,
                    owner: this
                });
            });

            item.on('idle', function() {
            });

            item.on( that.const.EVENTS.PASSING_FLOOR, function(floorNum, direction) {

                that.manager.triggerEvent( that.const.EVENTS.PASSING_FLOOR, {
                    floor: floorNum,
                    direction: direction,
                    owner: this
                });
            })

            item.on( that.const.EVENTS.STOPPED_AT_FLOOR, function(floorNum) {
                that.manager.triggerEvent( that.const.EVENTS.STOPPED_AT_FLOOR, {
                    floor: floorNum,
                    owner: this
                });
            })

        });

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}