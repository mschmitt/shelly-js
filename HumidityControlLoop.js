console.log("Script starts.")

// Read configuration values from key-value-store
let RestUrl;
let TurnOnBelow;
let TurnOffAbove;
let AlwaysOnOffHours;
Shelly.call("KVS.Get", { key: "RestUrl"}, function(result, error_code, error_message, userdata){ RestUrl = result.value; });
Shelly.call("KVS.Get", { key: "TurnOnBelow"}, function(result, error_code, error_message, userdata){ TurnOnBelow = result.value; });
Shelly.call("KVS.Get", { key: "TurnOffAbove"}, function(result, error_code, error_message, userdata){ TurnOffAbove = result.value; });
Shelly.call("KVS.Get", { key: "AlwaysOnOffHours"}, function(result, error_code, error_message, userdata){ AlwaysOnOffHours = JSON.parse(result.value); });

// Main interval loop
function actOnRestResponse(response, error_code, error_message) {
  let HourOfDay = new Date().getHours();
  if ( typeof AlwaysOnOffHours[HourOfDay] != 'undefined' ) {
    if (AlwaysOnOffHours[HourOfDay] === 'on') {
      console.log("Hour " + HourOfDay + ", always on");
      Shelly.call("Switch.Set", { id: 0, on: true });
    } else if (AlwaysOnOffHours[HourOfDay] === 'off') {
      console.log("Hour " + HourOfDay + ", always off");
      Shelly.call("Switch.Set", { id: 0, on: false });
    }
  } else if (response.code === 200) {
    // console.log("Handling valid response: " + response.body);
    let data = JSON.parse(response.body);
    // IoBroker response is in data.rh
    // Shelly Cloud response is in data.data.device_status.humidity:0
    if (data.rh > TurnOffAbove ) {
      console.log("Relative humidity: " + data.rh + " - TurnOffAbove: " + TurnOffAbove + " - Power OFF");
      Shelly.call("Switch.Set", { id: 0, on: false });
    } else if (data.rh < TurnOnBelow ) {
      console.log("Relative humidity: " + data.rh + " - TurnOnBelow: " + TurnOnBelow + " - Power ON");
      Shelly.call("Switch.Set", { id: 0, on: true });
    } else {
      console.log("Relative humidity: " + data.rh + " - TurnOffAbove: " + TurnOffAbove + " - TurnOnBelow: " + TurnOnBelow + " - No Action");
    }
  }else{
    console.log("No usable response: " + error_message)
  }
}

// Setup callback to wait until all keys have been read from KVS
function setup() {
  if (RestUrl === undefined) {
    console.log("Waiting for RestUrl")
    return 255;
  }
  if (TurnOnBelow === undefined) {
    console.log("Waiting for TurnOnBelow")
    return 255;
  }
  if (TurnOffAbove === undefined) {
    console.log("Waiting for TurnOffAbove")
    return 255;
  }
  if (AlwaysOnOffHours === undefined) {
    console.log("Waiting for AlwaysOffHours")
    return 255;
  }
  Timer.clear(SetupTimer);
  console.log("Setup complete, start polling: " + RestUrl)
  // Start main interval loop
  Timer.set(10 * 1000, true, function() {
    Shelly.call("HTTP.GET", {
      url: RestUrl,
      timeout: 5 
    }, actOnRestResponse);
  });
}
let SetupTimer = Timer.set(100, true, setup);
