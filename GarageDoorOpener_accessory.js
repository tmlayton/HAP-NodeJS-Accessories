(function() {
  var Accessory = require('../').Accessory;
  var Service = require('../').Service;
  var Characteristic = require('../').Characteristic;
  var uuid = require('../').uuid;
  var cmd = require('node-cmd');
  var wpi = require('wiring-pi');

  var GARAGE_DOOR = {
    isOpen: false,
    isMoving: false,
    open: function() {
      cmd.run('sudo python /home/pi/HAP-NodeJS/python/garage.py');
      this.isOpen = true;
      this.isMoving = true;
    },
    close: function() {
      cmd.run('sudo python /home/pi/HAP-NodeJS/python/garage.py');
      this.isOpen = false;
    },
    fetchStatus: function() {
      this.isOpen = getSensorReading();
    }
  };

  var garageName = 'Garage Door';
  var uuidTag = 'garage';
  var garageUUID = uuid.generate('hap-nodejs:accessories:' + uuidTag);
  var garage = exports.accessory = new Accessory(garageName, garageUUID);

  garage.username = 'C1:5D:3F:EE:5E:FA';
  garage.pincode = '031-45-154';

  garage
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, 'LiftMaster')
    .setCharacteristic(Characteristic.Model, 'Professional Formula I')
    .setCharacteristic(Characteristic.SerialNumber, '41AB050-2M');

  garage.on('identify', function(paired, callback) {
    callback();
  });

  garage
    .addService(Service.GarageDoorOpener, 'Garage Door')
    .setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED) // force initial state to CLOSED
    .getCharacteristic(Characteristic.TargetDoorState)
    .on('set', function(value, callback) {
      if (value === Characteristic.TargetDoorState.CLOSED && GARAGE_DOOR.isOpen) {
        GARAGE_DOOR.close();
      }
      else if (value === Characteristic.TargetDoorState.OPEN && !GARAGE_DOOR.isOpen) {
        GARAGE_DOOR.open();
        garage
          .getService(Service.GarageDoorOpener)
          .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
      }

      callback();
    });

  garage
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', function(callback) {
      GARAGE_DOOR.fetchStatus();
      callback(null, GARAGE_DOOR.isOpen ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
    });

  setInterval(function() {
    if (getSensorReading() === GARAGE_DOOR.isOpen) {
      return;
    }

    GARAGE_DOOR.fetchStatus();

    garage
      .getService(Service.GarageDoorOpener)
      .setCharacteristic(Characteristic.CurrentDoorState, !GARAGE_DOOR.isOpen);

    if (GARAGE_DOOR.isMoving) {
      GARAGE_DOOR.isMoving = false;
    } else {
      garage
        .getService(Service.GarageDoorOpener)
        .setCharacteristic(Characteristic.TargetDoorState, !GARAGE_DOOR.isOpen);
    }
  }, 1000);

  function getSensorReading() {
    wpi.setup('phys');
    return Boolean(wpi.digitalRead(12));
  }
})();
