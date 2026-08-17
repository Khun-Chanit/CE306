(function(){
  "use strict";

  var CURRENCIES = [
    { code:"THB", name:"บาทไทย" },
    { code:"USD", name:"ดอลลาร์สหรัฐ" },
    { code:"EUR", name:"ยูโร" },
    { code:"GBP", name:"ปอนด์สเตอร์ลิง" },
    { code:"JPY", name:"เยนญี่ปุ่น" },
    { code:"SGD", name:"ดอลลาร์สิงคโปร์" },
    { code:"AUD", name:"ดอลลาร์ออสเตรเลีย" },
    { code:"CNY", name:"หยวนจีน" }
  ];

  // Approximate fallback rates (relative to 1 USD), used only when the live API is unreachable.
  var FALLBACK_USD = {
    THB:36.2, USD:1, EUR:0.92, GBP:0.79, JPY:150.5, SGD:1.34, AUD:1.53, CNY:7.24
  };

  var DEFAULT_FROM = "THB";
  var DEFAULT_TO = "USD";
  var POLL_MS = 20000;      // how often we quietly re-check the live rate
  var TYPE_DEBOUNCE_MS = 140; // fast, but still avoids firing on every keystroke

  var elFrom = document.getElementById("currency-one");
  var elTo = document.getElementById("currency-two");
  var elAmountOne = document.getElementById("amount-one");
  var elAmountTwo = document.getElementById("amount-two");
  var flapRow = document.getElementById("flap-row");
  var board = document.getElementById("board");
  var pairLabel = document.getElementById("pair-label");
  var fromCodeMini = document.getElementById("from-code-mini");
  var updatedTimeEl = document.getElementById("updated-time");
  var srcTag = document.getElementById("src-tag");
  var swapBtn = document.getElementById("swap-btn");
  var clearBtn = document.getElementById("clear-btn");
  var confirmBtn = document.getElementById("confirm-btn");
  var clearHistoryBtn = document.getElementById("clear-history-btn");
  var ledgerList = document.getElementById("ledger-list");
  var ledgerEmpty = document.getElementById("ledger-empty");
  var fieldOne = elAmountOne.closest(".field");
  var fieldTwo = elAmountTwo.closest(".field");

  var chartPairLabel = document.getElementById("chart-pair-label");
  var changeBadge = document.getElementById("change-badge");
  var chartWrap = document.getElementById("chart-wrap");
  var chartEmpty = document.getElementById("chart-empty");
  var chartCanvas = document.getElementById("rate-chart");
  var rangeTabs = document.getElementById("range-tabs");

  var currentRate = null;   // 1 unit of "from" -> this many units of "to"
  var isFetching = false;
  var lastEditedField = "one"; // tracks which input the user is typing into
  var history = []; // in-memory only, most recent first
  var currentRangeDays = 30;
  var chartInstance = null;
  var pollTimer = null;
  var chartLibReady = false;

  function populateSelects(){
    CURRENCIES.forEach(function(c){
      var o1 = document.createElement("option");
      o1.value = c.code; o1.textContent = c.code + " — " + c.name;
      elFrom.appendChild(o1);

      var o2 = document.createElement("option");
      o2.value = c.code; o2.textContent = c.code + " — " + c.name;
      elTo.appendChild(o2);
    });
    elFrom.value = DEFAULT_FROM;
    elTo.value = DEFAULT_TO;
  }

  function formatNumber(n, maxDigits){
    if(maxDigits === undefined) maxDigits = 2;
    if(!isFinite(n)) return "";
    return n.toLocaleString("en-US", { maximumFractionDigits:maxDigits, minimumFractionDigits:0 });
  }

  function parseAmount(str){
    if(!str) return NaN;
    var cleaned = str.replace(/,/g, "").trim();
    if(cleaned === "") return NaN;
    var n = Number(cleaned);
    return n;
  }

  function fmtDate(d){
    return d.toISOString().slice(0, 10);
  }

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ---------- split-flap rendering ---------- */
  function renderFlaps(text){
    var chars = text.split("");
    var existing = flapRow.querySelectorAll(".flap:not(.wide)");
    var sameLength = existing.length === chars.filter(function(c){ return c !== "."; }).length;

    if(!flapRow.childElementCount || !sameLength){
      flapRow.innerHTML = "";
      chars.forEach(function(ch){
        var span = document.createElement("div");
        if(ch === "."){
          span.className = "flap wide";
          span.textContent = ".";
        } else {
          span.className = "flap";
          span.textContent = ch;
        }
        flapRow.appendChild(span);
      });
      return;
    }

    // animate only changed digits, so a live tick only flips what actually moved
    var nodes = flapRow.children;
    chars.forEach(function(ch, idx){
      var node = nodes[idx];
      if(!node) return;
      if(node.textContent !== ch){
        node.classList.remove("flipping");
        void node.offsetWidth; // restart animation
        node.classList.add("flipping");
        setTimeout(function(){ node.textContent = ch; }, 140);
        setTimeout(function(){ node.classList.remove("flipping"); }, 330);
      }
    });
  }

  function setFlapSkeleton(on){
    var nodes = flapRow.querySelectorAll(".flap");
    nodes.forEach(function(n){ n.classList.toggle("skeleton", on); });
  }

  function pulseBoard(){
    board.classList.remove("ticking");
    void board.offsetWidth;
    board.classList.add("ticking");
    setTimeout(function(){ board.classList.remove("ticking"); }, 900);
  }

  function updateBoard(from, to, rate, isLive, opts){
    opts = opts || {};
    pairLabel.textContent = from + " → " + to;
    fromCodeMini.textContent = from;
    var decimals = rate < 1 ? 4 : 2;
    renderFlaps(formatNumber(rate, decimals));
    if(!opts.silent) pulseBoard();

    var now = new Date();
    updatedTimeEl.textContent = now.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) +
      " · " + now.toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"numeric" });

    if(isLive){
      srcTag.textContent = "อัตราสด";
      srcTag.className = "src-tag live";
    } else {
      srcTag.textContent = "อัตราสำรอง (ออฟไลน์)";
      srcTag.className = "src-tag fallback";
    }
  }

  /* ---------- rate fetching ---------- */
  var rateCache = {}; // key "FROM_TO" -> { rate, live }

  function fallbackRate(from, to){
    var usdFrom = FALLBACK_USD[from];
    var usdTo = FALLBACK_USD[to];
    if(!usdFrom || !usdTo) return 1;
    return usdTo / usdFrom;
  }

  function getRate(from, to, opts){
    opts = opts || {};
    if(from === to){
      return Promise.resolve({ rate:1, live:true });
    }
    var key = from + "_" + to;
    if(!opts.bypassCache && rateCache[key]){
      return Promise.resolve(rateCache[key]);
    }
    var url = "https://api.frankfurter.dev/v1/latest?base=" + from + "&symbols=" + to;
    return fetch(url).then(function(res){
      if(!res.ok) throw new Error("bad response");
      return res.json();
    }).then(function(data){
      var r = data && data.rates && data.rates[to];
      if(typeof r !== "number" || !isFinite(r)) throw new Error("no rate");
      var result = { rate:r, live:true };
      rateCache[key] = result;
      return result;
    }).catch(function(){
      var result = { rate: fallbackRate(from, to), live:false };
      return result;
    });
  }

  /* ---------- confirm-button gating ---------- */
  function updateConfirmState(){
    var v1 = parseAmount(elAmountOne.value);
    var v2 = parseAmount(elAmountTwo.value);
    var hasValidAmount = (!isNaN(v1) && v1 > 0) || (!isNaN(v2) && v2 > 0);
    confirmBtn.disabled = !hasValidAmount || currentRate === null;
  }

  function flashConfirmed(){
    var original = "ยืนยันจำนวนเงิน";
    confirmBtn.textContent = "ยืนยันแล้ว ✓";
    confirmBtn.classList.add("confirmed");
    setTimeout(function(){
      confirmBtn.textContent = original;
      confirmBtn.classList.remove("confirmed");
    }, 1400);
  }

  function confirmConversion(){
    if(confirmBtn.disabled || currentRate === null) return;
    var from = elFrom.value;
    var to = elTo.value;
    var amt1 = parseAmount(elAmountOne.value);
    var amt2 = parseAmount(elAmountTwo.value);

    if(lastEditedField === "two" && !isNaN(amt2)){
      amt1 = amt2 / currentRate;
      elAmountOne.value = formatNumber(amt1, 4);
    } else if(!isNaN(amt1)){
      amt2 = amt1 * currentRate;
      elAmountTwo.value = formatNumber(amt2, 4);
    } else if(!isNaN(amt2)){
      amt1 = amt2 / currentRate;
      elAmountOne.value = formatNumber(amt1, 4);
    } else {
      return;
    }

    pushHistory(amt1, from, amt2, to, { force:true });
    pulseBoard();
    flashConfirmed();
  }

  /* ---------- conversion flow (live preview only — history needs Confirm) ---------- */
  function setPending(on, field){
    if(field === "two"){
      fieldOne.classList.toggle("pending", on);
    } else {
      fieldTwo.classList.toggle("pending", on);
    }
  }

  function runConversion(triggeredBy){
    var from = elFrom.value;
    var to = elTo.value;
    if(isFetching) return;
    isFetching = true;
    setPending(true, triggeredBy);

    getRate(from, to).then(function(res){
      isFetching = false;
      setPending(false, triggeredBy);
      currentRate = res.rate;
      updateBoard(from, to, res.rate, res.live);

      if(triggeredBy === "two"){
        var amt2 = parseAmount(elAmountTwo.value);
        if(!isNaN(amt2)){
          elAmountOne.value = formatNumber(amt2 / res.rate, 4);
        }
      } else {
        var amt1b = parseAmount(elAmountOne.value);
        if(!isNaN(amt1b)){
          elAmountTwo.value = formatNumber(amt1b * res.rate, 4);
        }
      }
      updateConfirmState();
    });
  }

  var debounceTimer = null;
  function scheduleConversion(triggeredBy, immediate){
    lastEditedField = triggeredBy;
    clearTimeout(debounceTimer);
    if(immediate){
      runConversion(triggeredBy);
      return;
    }
    debounceTimer = setTimeout(function(){ runConversion(triggeredBy); }, TYPE_DEBOUNCE_MS);
  }

  /* ---------- history ledger (requirement 2) — only written on Confirm ---------- */
  function pushHistory(amountFrom, from, amountTo, to, opts){
    opts = opts || {};
    if(!isFinite(amountFrom) || !isFinite(amountTo)) return;
    if(amountFrom === 0 && amountTo === 0) return;

    var now = new Date();
    var entry = {
      text: formatNumber(amountFrom, 2) + " " + from + " → " + formatNumber(amountTo, 2) + " " + to,
      from: from, to: to,
      time: now.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" })
    };

    // avoid duplicate spam if identical to the very last entry, unless explicitly forced by Confirm
    if(!opts.force && history.length && history[0].text === entry.text) return;

    history.unshift(entry);
    if(history.length > 10) history = history.slice(0, 10);
    renderHistory();
  }

  function renderHistory(){
    ledgerList.innerHTML = "";
    if(history.length === 0){
      ledgerEmpty.style.display = "block";
      return;
    }
    ledgerEmpty.style.display = "none";

    history.forEach(function(item){
      var li = document.createElement("li");

      var left = document.createElement("span");
      left.className = "convo";
      var parts = item.text.split("→");
      left.innerHTML = parts[0] + "→<b>" + parts[1] + "</b>";

      var right = document.createElement("span");
      right.className = "stamp";
      right.textContent = item.time;

      li.appendChild(left);
      li.appendChild(right);
      ledgerList.appendChild(li);
    });
  }

  function clearHistory(){
    history = [];
    renderHistory();
  }

  /* ---------- clear inputs (requirement 3) ---------- */
  function clearInputs(){
    elAmountOne.value = "";
    elAmountTwo.value = "";
    elFrom.value = DEFAULT_FROM;
    elTo.value = DEFAULT_TO;
    currentRate = null;
    pairLabel.textContent = DEFAULT_FROM + " → " + DEFAULT_TO;
    fromCodeMini.textContent = DEFAULT_FROM;
    flapRow.innerHTML = "";
    renderFlaps("—.——");
    updatedTimeEl.textContent = "—";
    srcTag.textContent = "รอข้อมูล…";
    srcTag.className = "src-tag";
    rateCache = {};
    updateConfirmState();
    if(chartLibReady) loadChart(DEFAULT_FROM, DEFAULT_TO, currentRangeDays);
    getRate(DEFAULT_FROM, DEFAULT_TO).then(function(res){
      currentRate = res.rate;
      updateBoard(DEFAULT_FROM, DEFAULT_TO, res.rate, res.live, { silent:true });
      updateConfirmState();
    });
  }

  /* ---------- swap ---------- */
  function swapCurrencies(){
    var f = elFrom.value, t = elTo.value;
    elFrom.value = t; elTo.value = f;
    var v1 = elAmountOne.value, v2 = elAmountTwo.value;
    elAmountOne.value = v2; elAmountTwo.value = v1;
    rateCache = {}; // direction changed
    if(chartLibReady) loadChart(elFrom.value, elTo.value, currentRangeDays);
    if(!isNaN(parseAmount(elAmountOne.value))){
      scheduleConversion("one", true);
    } else if(!isNaN(parseAmount(elAmountTwo.value))){
      scheduleConversion("two", true);
    } else {
      runConversion("one");
    }
  }

  /* ---------- Chart.js loader with multi-CDN fallback ---------- */
  function loadScriptTag(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error("failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureChartLib(){
    if(window.Chart){
      chartLibReady = true;
      return Promise.resolve();
    }
    var sources = [
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js",
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js",
      "https://unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js"
    ];
    var chain = Promise.reject();
    sources.forEach(function(src){
      chain = chain.catch(function(){ return loadScriptTag(src); });
    });
    return chain.then(function(){
      chartLibReady = !!window.Chart;
      if(!chartLibReady) throw new Error("Chart global missing after load");
    });
  }

  /* ---------- stock-style history chart ---------- */
  function setChartLoading(on){
    chartWrap.classList.toggle("loading", on);
  }

  function showChartMessage(msg){
    if(chartInstance){ chartInstance.destroy(); chartInstance = null; }
    setChartLoading(false);
    chartCanvas.style.display = "none";
    chartEmpty.textContent = msg;
    chartEmpty.style.display = "flex";
    changeBadge.textContent = "—";
    changeBadge.className = "change-badge";
  }

  function loadChart(from, to, days){
    currentRangeDays = days;

    if(!chartLibReady || typeof Chart === "undefined"){
      showChartMessage("โหลดกราฟไม่สำเร็จ — ลองรีเฟรชหน้าเว็บ หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      return;
    }

    if(from === to){
      showChartMessage("เลือกสกุลเงินสองสกุลที่ต่างกันเพื่อดูกราฟย้อนหลัง");
      chartPairLabel.textContent = from + " / " + to;
      return;
    }

    chartCanvas.style.display = "block";
    chartEmpty.style.display = "none";
    chartPairLabel.textContent = from + " / " + to;
    setChartLoading(true);

    var end = new Date();
    var start = new Date();
    start.setDate(start.getDate() - days);
    var url = "https://api.frankfurter.dev/v1/" + fmtDate(start) + ".." + fmtDate(end) +
      "?base=" + from + "&symbols=" + to;

    fetch(url).then(function(res){
      if(!res.ok) throw new Error("history fetch failed");
      return res.json();
    }).then(function(data){
      var rates = data && data.rates ? data.rates : {};
      var dates = Object.keys(rates).sort();
      var points = dates.map(function(d){ return { date:d, value: rates[d][to] }; })
        .filter(function(p){ return typeof p.value === "number" && isFinite(p.value); });
      setChartLoading(false);
      if(points.length < 2){
        showChartMessage("ยังไม่มีข้อมูลย้อนหลังเพียงพอสำหรับคู่สกุลเงินนี้");
        return;
      }
      renderChart(points, from, to);
    }).catch(function(){
      showChartMessage("ดึงข้อมูลกราฟไม่สำเร็จ — ลองใหม่อีกครั้ง หรือเปลี่ยนช่วงเวลา");
    });
  }

  function renderChart(points, from, to){
    var labels = points.map(function(p){ return p.date; });
    var values = points.map(function(p){ return p.value; });
    var first = values[0];
    var last = values[values.length - 1];
    var change = last - first;
    var pct = first !== 0 ? (change / first) * 100 : 0;
    var isUp = change >= 0;

    changeBadge.textContent = (isUp ? "▲ " : "▼ ") + Math.abs(pct).toFixed(2) + "%";
    changeBadge.className = "change-badge " + (isUp ? "up" : "down");

    var lineColor = isUp ? cssVar("--up") : cssVar("--down");
    var ctx = chartCanvas.getContext("2d");
    var gradient = ctx.createLinearGradient(0, 0, 0, chartWrap.clientHeight || 170);
    gradient.addColorStop(0, isUp ? "rgba(95,174,141,0.30)" : "rgba(193,84,60,0.28)");
    gradient.addColorStop(1, "rgba(20,42,61,0)");

    if(chartInstance){ chartInstance.destroy(); }
    chartInstance = new Chart(ctx, {
      type:"line",
      data:{
        labels: labels,
        datasets:[{
          data: values,
          borderColor: lineColor,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 14,
          pointHoverBackgroundColor: lineColor,
          pointHoverBorderColor: cssVar("--ink-2")
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:{ duration:650, easing:"easeOutQuart" },
        interaction:{ mode:"index", intersect:false },
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor: cssVar("--ink-2"),
            titleColor: cssVar("--muted"),
            bodyColor: cssVar("--paper"),
            borderColor: cssVar("--line"),
            borderWidth:1,
            padding:10,
            displayColors:false,
            titleFont:{ family:"IBM Plex Mono", size:10 },
            bodyFont:{ family:"IBM Plex Mono", size:12, weight:"600" },
            callbacks:{
              label:function(item){
                return "1 " + from + " = " + item.formattedValue + " " + to;
              }
            }
          }
        },
        scales:{
          x:{
            display:true,
            grid:{ display:false },
            border:{ color: cssVar("--line") },
            ticks:{ color: cssVar("--muted"), maxRotation:0, autoSkip:true, maxTicksLimit:6, font:{ family:"IBM Plex Mono", size:10 } }
          },
          y:{
            display:true,
            position:"right",
            grid:{ color:"rgba(237,230,214,0.06)" },
            border:{ display:false },
            ticks:{ color: cssVar("--muted"), maxTicksLimit:4, font:{ family:"IBM Plex Mono", size:10 } }
          }
        }
      }
    });
  }

  /* ---------- quiet live polling — gives the ticker a "still watching" feel ---------- */
  function startPolling(){
    clearInterval(pollTimer);
    pollTimer = setInterval(function(){
      var from = elFrom.value, to = elTo.value;
      if(from === to || document.hidden) return;
      getRate(from, to, { bypassCache:true }).then(function(res){
        currentRate = res.rate;
        updateBoard(from, to, res.rate, res.live);
        // keep whichever field the user was last editing authoritative
        if(lastEditedField === "two"){
          var amt2 = parseAmount(elAmountTwo.value);
          if(!isNaN(amt2)) elAmountOne.value = formatNumber(amt2 / res.rate, 4);
        } else {
          var amt1 = parseAmount(elAmountOne.value);
          if(!isNaN(amt1)) elAmountTwo.value = formatNumber(amt1 * res.rate, 4);
        }
        updateConfirmState();
      });
    }, POLL_MS);
  }

  /* ---------- event wiring ---------- */
  elAmountOne.addEventListener("input", function(){
    if(elAmountOne.value.trim() === ""){ elAmountTwo.value = ""; updateConfirmState(); return; }
    scheduleConversion("one");
    updateConfirmState();
  });
  elAmountTwo.addEventListener("input", function(){
    if(elAmountTwo.value.trim() === ""){ elAmountOne.value = ""; updateConfirmState(); return; }
    scheduleConversion("two");
    updateConfirmState();
  });
  elFrom.addEventListener("change", function(){
    rateCache = {};
    if(chartLibReady) loadChart(elFrom.value, elTo.value, currentRangeDays);
    scheduleConversion(lastEditedField === "two" ? "two" : "one", true);
  });
  elTo.addEventListener("change", function(){
    rateCache = {};
    if(chartLibReady) loadChart(elFrom.value, elTo.value, currentRangeDays);
    scheduleConversion(lastEditedField === "two" ? "two" : "one", true);
  });
  swapBtn.addEventListener("click", swapCurrencies);
  clearBtn.addEventListener("click", clearInputs);
  confirmBtn.addEventListener("click", confirmConversion);
  clearHistoryBtn.addEventListener("click", clearHistory);

  rangeTabs.addEventListener("click", function(e){
    var btn = e.target.closest(".range-tab");
    if(!btn) return;
    rangeTabs.querySelectorAll(".range-tab").forEach(function(b){ b.classList.remove("active"); });
    btn.classList.add("active");
    if(chartLibReady) loadChart(elFrom.value, elTo.value, Number(btn.dataset.range));
  });

  /* ---------- init ---------- */
  populateSelects();
  renderFlaps("—.——");
  setFlapSkeleton(true);
  renderHistory();
  updateConfirmState();

  // Fetch the default pair's live rate immediately on load — no waiting for user input.
  getRate(DEFAULT_FROM, DEFAULT_TO).then(function(res){
    currentRate = res.rate;
    setFlapSkeleton(false);
    updateBoard(DEFAULT_FROM, DEFAULT_TO, res.rate, res.live, { silent:true });
    updateConfirmState();
  });

  setChartLoading(true);
  ensureChartLib().then(function(){
    loadChart(DEFAULT_FROM, DEFAULT_TO, currentRangeDays);
  }).catch(function(){
    showChartMessage("โหลดไลบรารีกราฟไม่สำเร็จ — ลองรีเฟรชหน้าเว็บ หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
  });

  startPolling();

})();