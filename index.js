// imports libs
const Gpio = require('pigpio').Gpio;
const WebSocketClient = require('websocket').client;

// led control
const ledRed = new Gpio(9, {mode: Gpio.OUTPUT}); // led red pin 9
const ledBlue = new Gpio(11, {mode: Gpio.OUTPUT}); // led blue pin 11
let toggleLed = (toggleOnOff, led) => {
  if (toggleOnOff){
    led.pwmWrite(255);
  } else {
    led.pwmWrite(0);
  }
};
toggleLed(true, ledRed); // starts with red led on
toggleLed(true, ledBlue); // starts with blue led on

// servo motor control
const motor = new Gpio(10, {mode: Gpio.OUTPUT}); // servo motor pin 10
let candyTime = () => {  
  let pulseWidth = 1000;
  let increment = 1000;
  let count = 0;
  let ledLight = true;
  let spinInterval = setInterval(function () {
    if(ledLight){
      toggleLed(true, ledBlue);
      toggleLed(false, ledRed);
      ledLight = false;
    }else{
      toggleLed(false, ledBlue);
      toggleLed(true, ledRed);
      ledLight = true;
    }
    motor.servoWrite(pulseWidth);
    console.log("*** Candy time! ***");
    if(count > 4){
      clearInterval(spinInterval);
    }else{
      count++;
    }    
    pulseWidth += increment;
    if (pulseWidth >= 2000) {
      increment = -1000;
    } else if (pulseWidth <= 1000) {
      increment = 1000;
    }
  }, 1000);
}

// websocket control
console.log("Connecting...");
let client = new WebSocketClient();
client.connect('wss://testnet-ws.smartbit.com.au/v1/blockchain');

client.on('connectFailed', function(error) {
  console.log('Connect Error: ' + error.toString());
  toggleLed(false,ledRed); // turn off led
});

client.on('connect', function(connection) {
  console.log('WebSocket Connected');
  
  toggleLed(false, ledBlue); // starts with blue led off

  // check error connection
  connection.on('error', function(error) {
    console.log("Connection Error: " + error.toString());
    toggleLed(false,ledRed); // turn off led
  });
  
  // check close connection
  connection.on('close', function() {
    console.log('Connection Closed');
    toggleLed(false,ledRed); // turn off led
  });
  
  // send message to monitor address
  let receiveAddress = "munjWKThvRS4bqmk7KTghPaBLyAKfGhNTD";
  
  connection.sendUTF(JSON.stringify({
    type: "address", 
    address: receiveAddress
  }));  

  // ping websocket every 30 seconds (to make sure that the address messages are still subscribed)
  let pingInterval = setInterval(function () {
    console.log('Ping WebSocket');
    connection.sendUTF(JSON.stringify({
      type: "address", 
      address: receiveAddress
    }));
  }, 30000);
  
  // check received donations
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      let messageParsed = JSON.parse(message.utf8Data);
      if (messageParsed.type == 'address') {
        console.log("Received donation!");
        candyTime();
      }
    }
  });
});