/* Cron -> Workflow converter. Runs entirely in the browser. */
(function (root) {
  "use strict";

  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MACROS = {
    "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *",
    "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *"
  };
  var FIELDS = [
    { key: "minute", label: "Minute", min: 0, max: 59 },
    { key: "hour", label: "Hour", min: 0, max: 23 },
    { key: "dom", label: "Day (month)", min: 1, max: 31 },
    { key: "month", label: "Month", min: 1, max: 12, names: MONTHS, offset: 1 },
    { key: "dow", label: "Day (week)", min: 0, max: 7, names: DAYS, offset: 0 }
  ];

  function toNum(tok, f) {
    var t = tok.toUpperCase();
    if (f.names) {
      var i = f.names.indexOf(t);
      if (i > -1) return i + f.offset;
    }
    if (!/^\d+$/.test(t)) throw new Error('"' + tok + '" is not valid in the ' + f.label.toLowerCase() + " field");
    var n = parseInt(t, 10);
    if (n < f.min || n > f.max) throw new Error(f.label + " must be between " + f.min + " and " + f.max + ' (got "' + tok + '")');
    return n;
  }

  function parseField(src, f) {
    var set = {};
    src.split(",").forEach(function (part) {
      if (part === "") throw new Error("Empty value in the " + f.label.toLowerCase() + " field");
      var step = 1, range = part, m = part.split("/");
      if (m.length > 2) throw new Error('Too many "/" in "' + part + '"');
      if (m.length === 2) {
        range = m[0];
        if (!/^\d+$/.test(m[1]) || parseInt(m[1], 10) === 0) throw new Error('Step "/' + m[1] + '" must be a positive number');
        step = parseInt(m[1], 10);
      }
      var lo, hi;
      if (range === "*" || range === "?") { lo = f.min; hi = f.max; if (f.key === "dow") hi = 6; }
      else if (range.indexOf("-") > -1) {
        var r = range.split("-");
        if (r.length !== 2) throw new Error('Bad range "' + range + '"');
        lo = toNum(r[0], f); hi = toNum(r[1], f);
        if (lo > hi) throw new Error('Range "' + range + '" goes backwards');
      } else {
        lo = toNum(range, f);
        hi = m.length === 2 ? f.max : lo;
      }
      for (var v = lo; v <= hi; v += step) set[(f.key === "dow" && v === 7) ? 0 : v] = true;
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  function parse(expr) {
    var e = String(expr || "").trim().replace(/\s+/g, " ");
    if (!e) throw new Error("Enter a cron expression");
    var macro = null;
    if (e.charAt(0) === "@") {
      if (e.toLowerCase() === "@reboot") throw new Error("@reboot runs once at startup, so it has no schedule to show");
      macro = e.toLowerCase();
      if (!MACROS[macro]) throw new Error('Unknown macro "' + e + '"');
      e = MACROS[macro];
    }
    var parts = e.split(" ");
    if (parts.length === 6) throw new Error("That has 6 fields. Standard cron uses 5; if the first is seconds (Quartz style), remove it");
    if (parts.length !== 5) throw new Error("Expected 5 fields (minute hour day month weekday), got " + parts.length);
    var out = { raw: parts, macro: macro };
    FIELDS.forEach(function (f, i) { out[f.key] = parseField(parts[i], f); });
    out.domStar = parts[2] === "*" || parts[2] === "?";
    out.dowStar = parts[4] === "*" || parts[4] === "?";
    return out;
  }

  /* ---------- next runs ---------- */
  function matchesDay(c, y, mo, d, utc) {
    var date = utc ? new Date(Date.UTC(y, mo, d)) : new Date(y, mo, d);
    var dow = utc ? date.getUTCDay() : date.getDay();
    var domOk = c.dom.indexOf(d) > -1, dowOk = c.dow.indexOf(dow) > -1;
    if (c.domStar && c.dowStar) return true;
    if (c.domStar) return dowOk;
    if (c.dowStar) return domOk;
    return domOk || dowOk;
  }

  function nextRuns(c, count, from, utc) {
    var res = [], start = new Date(from.getTime() + 60000);
    var g = function (d, k) { return utc ? d["getUTC" + k]() : d["get" + k](); };
    var y = g(start, "FullYear"), mo = g(start, "Month"), d = g(start, "Date");
    var h0 = g(start, "Hours"), m0 = g(start, "Minutes"), first = true;
    for (var i = 0; i < 366 * 8 && res.length < count; i++) {
      var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      if (d > dim) { d = 1; mo++; if (mo > 11) { mo = 0; y++; } first = false; continue; }
      if (c.month.indexOf(mo + 1) > -1 && matchesDay(c, y, mo, d, utc)) {
        for (var hi = 0; hi < c.hour.length && res.length < count; hi++) {
          var h = c.hour[hi];
          if (first && h < h0) continue;
          for (var mi = 0; mi < c.minute.length && res.length < count; mi++) {
            var m = c.minute[mi];
            if (first && h === h0 && m < m0) continue;
            var t = utc ? new Date(Date.UTC(y, mo, d, h, m)) : new Date(y, mo, d, h, m);
            if (t >= start) res.push(t);
          }
        }
      }
      first = false; d++;
    }
    return res;
  }

  /* ---------- plain English ---------- */
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  function joinList(a) { return a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function stepOf(tok) { var m = /^(\*|\d+)\/(\d+)$/.exec(tok); return m ? { from: m[1], n: parseInt(m[2], 10) } : null; }
  function isRange(tok) { return /^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(tok); }

  function describeTime(c) {
    var mt = c.raw[0], ht = c.raw[1];
    var ms = stepOf(mt), hs = stepOf(ht);
    if (mt === "*" && ht === "*") return "Every minute";
    if (mt === "*" ) return "Every minute during " + describeHours(c, ht);
    if (ms && ms.from === "*" && ht === "*") return "Every " + ms.n + " minutes";
    if (ms && ms.from === "*") return "Every " + ms.n + " minutes during " + describeHours(c, ht);
    if (c.minute.length === 1 && ht === "*") return c.minute[0] === 0 ? "Every hour, on the hour" : "At " + c.minute[0] + " minutes past every hour";
    if (c.minute.length === 1 && hs && hs.from === "*") return "At " + c.minute[0] + " minutes past every " + hs.n + " hours";
    if (c.minute.length === 1 && isRange(ht) && c.hour.length > 3) return (c.minute[0] === 0 ? "Every hour, on the hour," : "At " + c.minute[0] + " minutes past every hour,") + " from " + pad(c.hour[0]) + ":" + pad(c.minute[0]) + " to " + pad(c.hour[c.hour.length - 1]) + ":" + pad(c.minute[0]);
    if (ht === "*") return "At minutes " + joinList(c.minute.map(String)) + " past every hour";
    if (c.minute.length * c.hour.length <= 6) {
      var times = [];
      c.hour.forEach(function (h) { c.minute.forEach(function (m) { times.push(pad(h) + ":" + pad(m)); }); });
      return "At " + joinList(times);
    }
    return "At minute " + joinList(c.minute.map(String)) + " past hour " + joinList(c.hour.map(String));
  }
  function describeHours(c, ht) {
    var hs = stepOf(ht);
    if (hs && hs.from === "*") return "every " + hs.n + " hours";
    if (isRange(ht)) return pad(c.hour[0]) + ":00–" + pad(c.hour[c.hour.length - 1]) + ":59";
    return "hour " + joinList(c.hour.map(function (h) { return pad(h) + ":00"; }));
  }
  function describeDow(c) {
    var t = c.raw[4], s = stepOf(t);
    var d = c.dow;
    if (d.join() === "1,2,3,4,5") return "Monday through Friday";
    if (d.join() === "0,6") return "on weekends";
    if (isRange(t) && d.length > 2) return DAY_NAMES[d[0]] + " through " + DAY_NAMES[d[d.length - 1]];
    if (s) return "every " + ord(s.n) + " day of the week";
    return "on " + joinList(d.map(function (x) { return DAY_NAMES[x]; }));
  }
  function describeDom(c) {
    var t = c.raw[2], s = stepOf(t);
    if (s && s.from === "*") return "every " + s.n + " days";
    if (isRange(t)) return "on days " + c.dom[0] + "–" + c.dom[c.dom.length - 1] + " of the month";
    return "on the " + joinList(c.dom.map(ord)) + " of the month";
  }
  function describeMonth(c) {
    var t = c.raw[3], s = stepOf(t);
    if (s && s.from === "*") return "every " + s.n + " months";
    if (isRange(t) && c.month.length > 2) return "from " + MONTH_NAMES[c.month[0] - 1] + " to " + MONTH_NAMES[c.month[c.month.length - 1] - 1];
    return "in " + joinList(c.month.map(function (m) { return MONTH_NAMES[m - 1]; }));
  }

  function describe(c) {
    var s = describeTime(c), days = [];
    if (c.dom.length === 1 && c.month.length === 1 && c.dowStar && !/[\/\-,*]/.test(c.raw[2] + c.raw[3]))
      return s + ", on " + MONTH_NAMES[c.month[0] - 1] + " " + ord(c.dom[0]) + ".";
    if (!c.domStar && !c.dowStar) days.push(describeDom(c) + " or " + describeDow(c));
    else if (!c.domStar) days.push(describeDom(c));
    else if (!c.dowStar) days.push(describeDow(c));
    var out = s + (days.length ? ", " + days[0] : "");
    if (c.raw[3] !== "*" && c.raw[3] !== "?") out += ", " + describeMonth(c);
    return out.replace(/,\s*Monday/, ", Monday") + ".";
  }

  root.UnCron = { parse: parse, nextRuns: nextRuns, describe: describe };

  /* ---------- UI ---------- */
  if (typeof document === "undefined") return;
  var JOBS = {
    shell: [["Schedule", "Schedule fires", "Same cron expression, managed centrally"], ["Agent", "Run the script on your server", "An Unmeshed agent runs the command and captures its output"], ["Switch", "Check the result", "Branch on exit code or output"], ["Integration", "Alert on failure", "Post to Slack or Teams only after retries are used up"]],
    api: [["Schedule", "Schedule fires", "Same cron expression, managed centrally"], ["HTTP", "Call the API", "Templated request with automatic retries and backoff"], ["Switch", "Check the response", "Branch on status code or body"], ["Integration", "Alert on failure", "Post to Slack or Teams only after retries are used up"]],
    python: [["Schedule", "Schedule fires", "Same cron expression, managed centrally"], ["Python", "Run the script", "Inline Python step, or a Python SDK worker for bigger jobs"], ["Switch", "Check the result", "Branch on the returned output"], ["Integration", "Alert on failure", "Post to Slack or Teams only after retries are used up"]],
    data: [["Schedule", "Schedule fires", "Same cron expression, managed centrally"], ["HTTP", "Read from the source", "Fetch new or changed records"], ["Foreach", "Process each record", "Transform and validate items one by one or in parallel"], ["HTTP", "Write to the destination", "Upsert with retries; failed items can be replayed"], ["Integration", "Report the run", "Send a summary or alert"]]
  };
  var UN = "https://unmeshed.io";
  var DOCS = { Schedule: "/docs/concepts/schedules", HTTP: "/docs/refs/step-type-http", Python: "/docs/refs/step-type-python", Switch: "/docs/refs/step-type-switch-case", Foreach: "/docs/refs/step-type-foreach", Integration: "/docs/refs/step-type-integration", Agent: "/docs/agents/adding-agents-for-command-executions" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var current = "";

  function render() {
    var expr = $("cron").value, utc = $("tz").value === "utc";
    var fm = $("fieldmap"), parts = expr.trim().split(/\s+/);
    try {
      var c = parse(expr);
      fm.innerHTML = FIELDS.map(function (f, i) { return "<div><b>" + esc(c.raw[i]) + "</b>" + f.label + "</div>"; }).join("");
      current = describe(c);
      $("human").textContent = current;
      $("human").className = "human";
      var runs = nextRuns(c, 5, new Date(), utc);
      var fmt = function (d) {
        var opts = { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false };
        if (utc) opts.timeZone = "UTC";
        return d.toLocaleString("en-GB", opts);
      };
      var now = Date.now();
      $("runs").innerHTML = runs.length ? runs.map(function (d) {
        var mins = Math.round((d - now) / 60000), rel = mins < 60 ? "in " + mins + " min" : mins < 2880 ? "in " + Math.round(mins / 60) + " h" : "in " + Math.round(mins / 1440) + " days";
        return "<li>" + esc(fmt(d)) + (utc ? " UTC" : "") + "<span>" + rel + "</span></li>";
      }).join("") : '<li>No runs in the next 8 years. Check the day and month fields.</li>';
    } catch (e) {
      fm.innerHTML = FIELDS.map(function (f, i) { return "<div><b>" + esc(parts[i] || "?") + "</b>" + f.label + "</div>"; }).join("");
      current = "";
      $("human").textContent = e.message;
      $("human").className = "human err";
      $("runs").innerHTML = "";
    }
    var steps = JOBS[$("job").value];
    $("wf").innerHTML = steps.map(function (s, i) {
      var label = i === 0 ? esc(s[1]) + ' <span class="mono" style="font-size:.85rem;color:#71717a">(' + esc(expr.trim() || "…") + ")</span>" : esc(s[1]);
      return '<div class="node"><div class="num">' + (i + 1) + '</div><div class="body"><a class="type" href="' + UN + DOCS[s[0]] + '">' + esc(s[0]) + "</a><strong>" + label + "</strong><p>" + esc(s[2]) + "</p></div></div>";
    }).join("");
    try { history.replaceState(null, "", "?cron=" + encodeURIComponent(expr.trim())); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    var q = new URLSearchParams(location.search).get("cron");
    if (q) $("cron").value = q;
    ["cron", "tz", "job"].forEach(function (id) { $(id).addEventListener("input", render); $(id).addEventListener("change", render); });
    document.querySelectorAll("[data-cron]").forEach(function (b) {
      b.addEventListener("click", function () { $("cron").value = b.getAttribute("data-cron"); render(); });
    });
    $("copy").addEventListener("click", function () {
      if (!current) return;
      var text = $("cron").value.trim() + "  →  " + current;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
        $("copy").textContent = "Copied!"; setTimeout(function () { $("copy").textContent = "Copy description"; }, 1500);
      }, function () {});
    });
    render();
  });
})(typeof window !== "undefined" ? window : globalThis);
