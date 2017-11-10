function isCalendarUrl(url) {
  return url.match(/GetCalendarView/) && url.match(/su=su/) === null;
}

let taskStringStore = null;
let headers = null;

chrome.webRequest.onCompleted.addListener((details) => {
  if (isCalendarUrl(details.url)) {
    chrome.cookies.getAll({}, (d)  => {
      const domains = d.filter(a => a.domain.match(/office365/));
    })
    
    chrome.tabs.executeScript(details.tabId, {
      code: `fetch("${details.url}&su=su",
      {credentials: "include" ,method: "POST", headers: ${JSON.stringify(headers)} })
        .then(res => res.json())
        .then(json => {
          chrome.runtime.sendMessage({json, type: "su-tasks"})
          return null;
        })
        .then(() => fetch("${getUserAvailabilityInternal}&su=su", {credentials: "include" ,method: "POST", headers: ${userAvailabilityHeader()} }))
        .then(res => res.json())
        .then(json => {
          chrome.runtime.sendMessage({json, type: "su-calendar"})
          return null;
        })
        `
    })
  }
},
  {urls: ['<all_urls>']},
  []
);
chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (isCalendarUrl(details.url)) {
    headers = details.requestHeaders.map(({name, value}) => ({[name]: value})).reduce((acc, ccc) => Object.assign({}, acc, ccc) , {});
  }
},{urls: ['<all_urls>']}, ["requestHeaders"])

function dateToSlashFormat(date) {
  return (new Date(date)).getMonth() + "/" + (new Date(date)).getDate();
}

function dateDuration(a, b) {
  return (new Date(a)).getTime() -  (new Date(b)).getTime();
}

chrome.runtime.onMessage.addListener(message => {  
  if (message.type === "su-tasks") {
    receiveTask(message.json.Body.Items);    
  } else if (message.type === "su-calendar") {
    receiveUserAvailabilityInternal(message.json)
  }
});

function receiveTask(tasks) {
  const taskStrings = tasks
  .map(({Start, End, Subject}) => ({ startTime: Start, endTime: End, subject: Subject }))
  .map(({subject, startTime, endTime}) => ({date: dateToSlashFormat(startTime), endTime, startTime, subject, duration: dateDuration(endTime, startTime)}))
  .map(taskToString);

  taskStringStore = taskStrings;
}

function taskToString(t) { return t.date + ": " + t.subject + " " + (new Date(t.duration).getHours() - 9) + ":" + (new Date(t.duration)).getMinutes() };
function getTaskStrings() {
  return taskStringStore;
}

const getUserAvailabilityInternal = "https://outlook.office.com/owa/service.svc?action=GetUserAvailabilityInternal&ID=-58&AC=1";

function userAvailabilityHeader() {
  const copyHeaders = JSON.parse(JSON.stringify(headers));
  copyHeaders.action = "GetUserAvailabilityInternal";
  copyHeaders["x-owa-actionname"] = "GetUserAvailabilityInternal";
 return JSON.stringify(copyHeaders);
}
function receiveUserAvailabilityInternal(calendars) {
  console.log(calendars)
}