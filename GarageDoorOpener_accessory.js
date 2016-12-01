(function() {
  var Accessory = require('../').Accessory;
  var Service = require('../').Service;
  var Characteristic = require('../').Characteristic;
  var uuid = require('../').uuid;
  var cmd = require('node-cmd');
  var wpi = require('wiring-pi');

  var GARAGE_DOOR = {
    isOpening: false,
    isClosing: false,
    isOpen: getSensorReading(),
    run: function() {
      cmd.run('sudo python /home/pi/HAP-NodeJS/python/garage.py');
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
    .setCharacteristic(Characteristic.TargetDoorState, GARAGE_DOOR.isOpen ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED)
    .getCharacteristic(Characteristic.TargetDoorState)
    .on('set', function(value, callback) {
      if (value === Characteristic.TargetDoorState.CLOSED && GARAGE_DOOR.isOpen) {
        GARAGE_DOOR.isClosing = true;
        GARAGE_DOOR.run();
      } else if (value === Characteristic.TargetDoorState.OPEN && !GARAGE_DOOR.isOpen) {
        GARAGE_DOOR.isOpening = true;
        GARAGE_DOOR.run();
      }

      callback();
    });

  garage
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', function(callback) {
      callback(null, GARAGE_DOOR.isOpen ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
    });

  setInterval(function() {
    var garageOpen = getSensorReading();

    if (garageOpen === GARAGE_DOOR.isOpen) {
      return;
    }

    if (GARAGE_DOOR.isClosing) {
      GARAGE_DOOR.isClosing = false;
      GARAGE_DOOR.isOpen = false;
      garage
        .getService(Service.GarageDoorOpener)
        .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
    } else if (GARAGE_DOOR.isOpening) {
      GARAGE_DOOR.isOpening = false;
      GARAGE_DOOR.isOpen = true;
      garage
        .getService(Service.GarageDoorOpener)
        .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
    } else {
      GARAGE_DOOR.isOpen = garageOpen;
      garage
        .getService(Service.GarageDoorOpener)
        .setCharacteristic(Characteristic.CurrentDoorState, GARAGE_DOOR.isOpen ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED)
        .setCharacteristic(Characteristic.TargetDoorState, GARAGE_DOOR.isOpen ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED);
    }
  }, 1000);

  function getSensorReading() {
    wpi.setup('phys');
    return Boolean(wpi.digitalRead(12));
  }
})();
