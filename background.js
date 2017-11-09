function isCalendarUrl(url) {
  return url.match(/GetCalendarView/);
}
chrome.webRequest.onCompleted.addListener((details) => {
  if (isCalendarUrl(details.url)) {
    chrome.cookies.getAll({}, (d)  => {
      const domains = d.filter(a => a.domain.match(/office365/));
    })

    chrome.tabs.executeScript(details.tabId, {
      code: `function taskToString(t) { return t.date + ": " + t.subject + " " + (new Date(t.duration).getHours() - 9) + ":" + (new Date(t.duration)).getMinutes() };
      fetch("https://outlook.office365.com/owa/service.svc?action=GetCalenderView&EP=1&ID=-9&AC=1",
      {credentials: "include" ,method: "POST", headers: ${JSON.stringify(headers)} })
        .then(res => res.json())
        .then((j) => j.Body.Items.map(({Start, End, Subject}) => ({ startTime: Start, endTime: End, subject: Subject })))
        .then(tasks => tasks.map(({subject, startTime, endTime}) => ({date: (new Date(startTime)).getMonth() + "/" + (new Date(startTime)).getDate(), endTime, startTime, subject, duration: ( (new Date(endTime)).getTime() -  (new Date(startTime)).getTime() )})))
        .then(ts => {
          const parser = new DOMParser();
          const tasks = ts.map(t => "<li>" + taskToString(t) + "</li>").join("");
          const ul = document.createElement("ul");
          ul.innerHTML = tasks;
          const button = document.createElement("button")
          button.innerText = "づん"
          document.body.insertBefore(button, document.body.firstChild)
          button.addEventListener("click", () => {
            document.body.insertBefore(ul, document.body.firstChild)
          }, false);
          console.log(tasks)
        })`
    }, (d) => {

    })

  }
  a(details);
},
  {urls: ['<all_urls>']},
  []
);
let headers = null;
chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (isCalendarUrl(details.url)) {
    headers = details.requestHeaders.map(({name, value}) => ({[name]: value})).reduce((acc, ccc) => Object.assign({}, acc, ccc) , {});
  }
},{urls: ['<all_urls>']}, ["requestHeaders"])
