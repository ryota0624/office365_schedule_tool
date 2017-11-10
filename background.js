function isCalendarUrl(url) {
  return url.match(/GetCalendarView/) && url.match(/su=su/) === null;
}

let taskStringStore = null;
let headers = null;
let lastUpdate = null;

chrome.webRequest.onCompleted.addListener((details) => {
  if (lastUpdate === null || Date.now() > (lastUpdate + 60000)) {
    if (isCalendarUrl(details.url)) {
      lastUpdate = Date.now();
      chrome.cookies.getAll({}, (d)  => {
        const domains = d.filter(a => a.domain.match(/office365/));
      });
      
      chrome.tabs.executeScript(details.tabId, {
        code: `fetch("${details.url}&su=su",
        {credentials: "include" ,method: "POST", headers: ${JSON.stringify(headers)} })
          .then(res => res.json())
          .then(json => {
            chrome.runtime.sendMessage({json, type: "su-tasks"})
          });`
      });
    }
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
