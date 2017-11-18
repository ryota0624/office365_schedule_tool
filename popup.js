// chrome.browserAction.onClicked.addListener();

class ExcludedTextsLocalStorage {
  set(texts) {
    window.localStorage.setItem("su-calendar-exluded-text", texts.join("∩"));
  }

  get() {
    const raw = window.localStorage.getItem("su-calendar-exluded-text").split("∩");
    return raw.length === 1 && raw[0] === "" ? [] : raw;
  }
}

window.onload = () => {
  const dom = window.Inferno.createElement;
  const clone = window.Inferno.cloneVNode
  const Inferno = window.Inferno;
  const _dom = (name) => (props, children) => dom(name, props, children);
  
  const table = _dom("table");
  const div = _dom("div");
  const button = _dom("button");
  const tr = _dom("tr");
  const th = _dom("th");
  const td = _dom("td");
  const li = _dom("li");
  const p = _dom("p");
  const input = _dom("input");
  const a = _dom("a");

  class ParameterError extends Error {}

  class RootComponent extends Inferno.Component {
    constructor(props) {
      super(props);
      const excludedTexts = props.excludedTextsLocalStorage.get();
      this.state = {
        excludedTexts: excludedTexts,
        inputExcludeText: "",
        showList: false,
        excludeTextRegExp: new RegExp(excludedTexts.length > 0 ? excludedTexts.join("|") : "$."),
        error: null
      }
    }

    checkDuplicateExcludeText(inputText, alreadlyExcludedTexts) {
      return alreadlyExcludedTexts.some(text => text === inputText)
    }

    pushExcludedTexts() {
      if (this.checkDuplicateExcludeText(this.state.inputExcludeText, this.state.excludedTexts)) {
        this.setState({error: new ParameterError("すでに除外されたテキストです")});
        return;
      }      

      const excludedTexts = [].concat(this.state.excludedTexts, this.state.inputExcludeText);
      const excludeTextRegExp = new RegExp(excludedTexts.length > 0 ? excludedTexts.join("|") : "$.");      
      
      this.props.excludedTextsLocalStorage.set(excludedTexts);      

      this.setState({
        excludedTexts,
        inputExcludeText: "",
        excludeTextRegExp
      });
    }

    removeExludedTexts(removeText) {
      const excludedTexts = this.state.excludedTexts.filter((text) => {
        return text !== removeText;
      });

      this.props.excludedTextsLocalStorage.set(excludedTexts);

      const excludeTextRegExp = new RegExp(excludedTexts.length > 0 ? excludedTexts.join("|") : "$.");      
      
      this.setState({
        excludedTexts,
        excludeTextRegExp
      });
    }

    showList(show) {
      this.setState({
        showList: show
      });
    }

    clearError() {
      this.setState({error: null});
    }

    render() {
      if (this.state.error) {
        throw this.state.error;
      }
      return view({ 
        tasks: this.props.tasks && this.props.tasks.filter(task => {
          return !this.state.excludeTextRegExp.test(task.subject);
        }),
        inputExcludeText: this.state.inputExcludeText,
        excludedTexts: this.state.excludedTexts,
        showList: this.state.showList,       
      } , {
        onClickListOpenButton: () => this.showList(true), 
        onClickListCloseButton: () => this.showList(false),
        onInputExcludeText: (text) => {
          this.setState({inputExcludeText: text});
        }, 
        onSubmitExcludeText: () => {
          this.pushExcludedTexts();
        },        
        onClickRemoveExcludeButton: (text) => {
          this.removeExludedTexts(text);
        }
      });
    }
  }

  /**
   * この辺イベント駆動にしたい
   */
  const bgPage = chrome.extension.getBackgroundPage()
  const tasks = bgPage.groupByMonth() || {};
  const content = document.getElementById("content");
  const now = new Date(Date.now());
  const targetTasks = tasks[now.getMonth()];
  if (content !== null) {
    Inferno.render(Inferno.createElement(RootComponent, {tasks: targetTasks, excludedTextsLocalStorage: new ExcludedTextsLocalStorage()}), content);    
  }

  bgPage.onChangeStore(() => {
    if (content !== null) {
      Inferno.render(Inferno.createElement(RootComponent, {tasks: targetTasks, excludedTextsLocalStorage: new ExcludedTextsLocalStorage()}), content);    
    }
  });


  function view({tasks, inputExcludeText, excludedTexts, showList}, props) {
    function taskView() {
      if (tasks === null || tasks === undefined) { 
        return div(null, ["please jump outlook page: ", a({href: "https://outlook.office.com/owa/?path=/calendar/view/Month"}, "https://outlook.office.com/owa/?path=/calendar/view/Month")]);
      }
      else { 
        return tasksTableView(tasks);
      }
    }
    
    return div(null, [
      button({onClick: () => execCopy(`date	title	time\n${tasksToCopyString(tasks)}`) }, "copy to clipboard"),
      excludeTextForm({ inputExcludeText, excludedTexts, showList }, props),
      taskView()
    ])
  }

  function excludeTextForm({ inputExcludeText, excludedTexts, showList }, { 
    onSubmitExcludeText, onClickListOpenButton, onClickListCloseButton, onInputExcludeText, onClickRemoveExcludeButton
  }) {
    return div(null, [
      p(null, [
        "filterWord",
        input({ onInput: (ev) => onInputExcludeText(ev.target.value), value: inputExcludeText }),
        button({ onClick: onSubmitExcludeText }, "submit")
      ]),
      showList || button({ onClick: onClickListOpenButton }, "show excluded words"),
      showList && excludedTextList(excludedTexts),
      showList && button({ onClick: onClickListCloseButton }, "hide excluded words"),
    ])

    function excludedTextList(texts) {
      return texts.map(text => li(null, [
        text, button({ onClick: () => onClickRemoveExcludeButton(text) }, "delete")
      ]));
    }
  }
  
  function tasksTableView(tasks) {
    return table(null, [
      tr(null, [
        th(null, "date"), th(null, "title"), th(null, "time"),
      ]),
      tasks.map(taskView)
    ])
  }
  
  function taskView(task) {
    return tr(null, [
      td(null, task.date),
      td(null, task.subject),
      td(null, duration(new Date(task.duration)))
    ])
  }
}

function tasksToCopyString(tasks) {
  return tasks.map(({date, subject, duration: d}) => {
    const strDuration = duration(new Date(d));
    return `${date}	${subject}	${strDuration}`;
  }).join("\n");
}

/**
 * 除外設定
 * @param {*} t 
 */

function taskToString(t) {
  return `<tr>
    <td>${t.date}</td>
    <td>${t.subject}</td>
    <td>${duration(new Date(t.duration))}</td>    
  </tr>`
};

function duration(t) {
  function formatNumberToFillString(n) {
    const strNumber = String(n);
    if (strNumber.length > 1) {
      return strNumber;
    } else {
      return `0${strNumber}`;
    }
  }
  const hours = (() => formatNumberToFillString(t.getHours() - 9))();
  const minutes = (() => formatNumberToFillString(t.getMinutes()))();
  return hours + ":" + minutes;
}

function execCopy(string){
  var temp = document.createElement('div');

  temp.appendChild(document.createElement('pre')).textContent = string;

  var s = temp.style;
  s.position = 'fixed';
  s.left = '-100%';

  document.body.appendChild(temp);
  document.getSelection().selectAllChildren(temp);

  var result = document.execCommand('copy');

  document.body.removeChild(temp);
  // true なら実行できている falseなら失敗か対応していないか
  return result;
}

// 土日除外