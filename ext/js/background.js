chrome.commands.onCommand.addListener((command) => {
  handleCommand(command)
})

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.hasOwnProperty('message')) {
      setIcon(request.message)
    }
  })

chrome.browserAction.onClicked.addListener((tab) => {
  handleCommand('toggle_mute')
})

// Inject keypress for toggling mute into appropriate tab
function sendKeypress (tab) {
	chrome.tabs.query({url: "https://meet.google.com/*"}, function(tabs) {
		if (x != -1) {
			chrome.tabs.executeScript(tabs[x].id, {
				file: 'js/sendKeypress.js'
			});
		}
	});
}

// Global variables. Bad practice I know. Some of these should be booleans.

var x = -1; // Keeps track of id of which tab to interact with
var only_base = 0; // If only meet.google.com is open (doesn't include meet.google.com/xxx-xxxx-xxx)
var base = 0; // If meet.google.com is open
var alerts = 0; // If an alert has been triggered related to having too many meet windows open
var count = 0; // Number of meet.google.com/xxx-xxxx-xxx windows open

function assessTabs() {
  chrome.tabs.query({ url: "https://meet.google.com/*" }, function (tabs) {

    // Reset global variable values
    base = 0;
    only_base = 0;
    x = -1;
    count = 0;

    // Checks if meet.google.com is open and how many xxx-xxxx-xxx meets
    tabs.forEach(function (item, index) {
      if (item.url == 'https://meet.google.com/') {
        base = 1;
      } else {
        count++;
      };
    });

    // Checks if only meet.google.com is open
    if ((base == 1) && (count == 0)) {
      only_base = 1;
    };

    // If xxx-xxxx-xxx meets are open set alarm, so that they can be monitored
    if (count > 0) {
      chrome.alarms.create("3sec", {
        delayInMinutes: 0.05,
        periodInMinutes: 0.05
      });
    }

    // If xxx-xxxx-xxx meets are all closed, stop the alarm and reset icon and badge
    if (count == 0) {
      chrome.alarms.clear("3sec");
      // chrome.browserAction.setIcon({ path: "M_gray128.png" });
      chrome.browserAction.setBadgeText({ text: '' });
    }

    // If only one meet is open reset alert
    if (count == 1) {
      alerts = 0;
      chrome.browserAction.setBadgeText({ text: '' });
    }

    // If an alert hasn't been triggered and if more than one xxx-xxxx-xxx meet is open, alert to close some
    tabs.forEach(function (item, index) {
      if (alerts == 0) {
        if (count > 1) {
          alert('You have ' + count + ' Google Meets open. Close all but one.');
          alerts = 1;
          chrome.browserAction.setBadgeText({ text: 'Err' });
        } else {
          // If only one meet is open and no alerts have been triggered, set x with the id of the tab to interact with
          x = index;
        }
      };
    });
  });
};

function handleCommand(command) {
  chrome.windows.getAll({ populate: true }, windowList => {
    let googleMeetTabs = getGoogleMeetTabs(windowList)

    if (googleMeetTabs.length > 0) {
      processCommand(command, googleMeetTabs)
    }
  })
}

function getGoogleMeetTabs(windowList) {
  let googleMeetTabs = []
  windowList.forEach(w => {
    w.tabs.forEach(tab => {
      if (tab && tab.url && tab.url.startsWith('https://meet.google.com/')) {
        googleMeetTabs.push(tab)
      }
    })
  })
  return googleMeetTabs
}

function processCommand(command, googleMeetTabs) {
  googleMeetTabs.forEach((tab) => {
    assessTabs()
    sendKeypress()
  })
}

function setIcon(status) {
  let iconType = ''
  if (status === 'muted' || status === 'unmuted') {
    iconType = '_' + status
  }
  let title = status.charAt(0).toUpperCase() + status.substr(1)
  chrome.browserAction.setIcon({
    path: {
      "16": `icons/icon16${ iconType }.png`,
      "48": `icons/icon48${ iconType }.png`
    }
  })
  chrome.browserAction.setTitle({
    title: title
  })
}