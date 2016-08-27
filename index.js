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
            '6' : 0.65,
            '10': 0.6
        }
    },

    manager: {},

    // floorQueue: (function() {
    //     var _queue = {}
    //     return {
    //         add: function(level, direction) {
    //             if ( !_queue[level] ) _queue[level] = { };
    //             _queue[level][direction] = true;

    //         },

    //         remove: function(level, direction) {
    //             if (! _queue[level] ) return false;
    //             if (! _queue[level][direction] ) return false;


    //             delete _queue[level][direction];

    //             if ( !Object.keys(_queue[level]).length ) {
    //                 delete _queue[level];
    //             };

    //             return true;
    //         },

    //         isClicked: function(level, direction) {
    //             return _queue[level] && _queue[level][direction];
    //         },

    //         getObj: function() {
    //             return Object.assign({}, _queue);
    //         },

    //         getNearFloor: function(floorNum, direction) {
    //             if (Object.keys(_queue).length) {

    //                 var arrDistance = Object.keys(_queue).map(function(item) {
    //                     return ({
    //                         floor: item,
    //                         distance: Math.abs(item - floorNum)
    //                     })
    //                 });

    //                 arrDistance = arrDistance.sort(function(a, b) {
    //                     return a.distance - b.distance;
    //                 })

    //                 return arrDistance[0];
    //             }

    //             return null;
    //         }
    //     }
    // })(),

    floorsPrototype : {},

    floors: [],

    init: function(elevators, floors) {

        var that = this;
        var elevators2 = elevators;//[elevators[0]];



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
                                    // this.floorQueue.remove(params.owner.currentFloor(), this.const.DOWN);
                                }
                                else {
                                    params.owner.goingDownIndicator(false);
                                    params.owner.goingUpIndicator(true);
                                    // this.floorQueue.remove(params.owner.currentFloor(), this.const.UP);
                                }


                            }
                            else { // is empty 
                                params.owner.goingDownIndicator(true);
                                params.owner.goingUpIndicator(true);

                                var nearFloor = this.floorsPrototype.getNearFloor(params.floor);
                                
                                if (nearFloor != null ) {
                                    // this.floorQueue.remove(nearFloor.floor, this.const.UP);
                                    // this.floorQueue.remove(nearFloor.floor, this.const.DOWN);
                                    params.owner.goToFloor(nearFloor.floor);
                                }
                                
                            }

                            break;

                        case this.const.EVENTS.PASSING_FLOOR:

                            var stopAtThisFloor = false;

                            if (! this.const.LOADSTAT[params.owner.maxPassengerCount().toString()] ) throw new Error("don't have const LOADSTAT for " + params.owner.maxPassengerCount() +  " passenger")

                            if ( params.owner.loadFactor() <  this.const.LOADSTAT[params.owner.maxPassengerCount().toString()] ) {
                                stopAtThisFloor = stopAtThisFloor || this.floorsPrototype.isClicked(params.floor, params.direction);
                            }

                            stopAtThisFloor = stopAtThisFloor || (params.owner.getPressedFloors().indexOf(params.floor) !== -1);


                            if ( stopAtThisFloor ) {
                                // this.floorQueue.remove(params.floor, params.direction);
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
                // console.log('idle');
            });

            item.on( that.const.EVENTS.PASSING_FLOOR, function(floorNum, direction) {

                that.manager.triggerEvent( that.const.EVENTS.PASSING_FLOOR, {
                    floor: floorNum,
                    direction: direction,
                    owner: this
                });
                // console.debug( 'distanceQueue', this.destinationQueue );
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