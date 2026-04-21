"use strict";

// History module - handles practice history display, filtering, and graphing

// Show history container
function showHistory() {
    busyIndicator(true);

    setTimeout(() => {
      animateOpen("historyTableContainer");
      setTimeout(function() {
        filterAndDisplayHistory();
      }, 300);
      busyIndicator(false);
    }, 50);
}

// Populate the history table with run data
function populateHistoryTable() {
    const historyTableBody = document.getElementById("historyTableBody");
    historyTableBody.innerHTML = ""; // Clear the table body

    if (runHistory === null) {
      loadRunHistory();
    }

    populateTestNameOptions();

    return;
}

// Populate test name dropdown options
function populateTestNameOptions() {
    const testNameSelect = document.getElementById("testNameHistorySelect");
    testNameSelect.innerHTML = ""; // blank it out

    // add the "all" option
    const allopt = document.createElement("option");
    allopt.value = "all";
    allopt.textContent = " ALL";
    testNameSelect.appendChild(allopt);

    const testNames = Object.keys(runHistory);
    const seen = [];
    testNames.forEach((testName) => {
        if (testName.startsWith(".PREF.") || runHistory[testName].isFreePlay) {
          return;
        }
        const option = document.createElement("option");
        const [date, preset, hand] = testName.split("|");

        const decoded = decodeHTMLEntities(preset);
        if (typeof seen[preset] !== 'undefined') {
          return;
        }
        seen[preset] = true;
        option.value = preset;
        option.textContent = decoded;

        if (preset === (curPresetName+historyNameModifier())) {
          option.selected = true;
        }
        testNameSelect.appendChild(option);

        // also select current hand
        const h = getSelectedHand();
        const sel = document.getElementById("handSelect");
        sel.value = h;
    });

    sortSelectedOptions(testNameSelect);
}

// Sort select options alphabetically
function sortSelectedOptions(select) {
  // Get all options in the select element
  const options = Array.from(select.options);

  // Sort the options alphabetically by textContent
  options.sort((a, b) => {
    const textA = a.textContent.toUpperCase();
    const textB = b.textContent.toUpperCase();
    return textA.localeCompare(textB);
  });

  // Clear the select element
  select.innerHTML = '';

  // Append the sorted options back to the select element
  options.forEach((option) => {
    select.appendChild(option);
  });
}

// Decode HTML entities
function decodeHTMLEntities(html) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

// Filter and display history based on selected filters
function filterAndDisplayHistory() {
    const historyTableBody = document.getElementById("historyTableBody");
    historyTableBody.innerHTML = ""; // Clear the existing rows in the table

    const dateRange = document.getElementById("dateRangeSelect").value;
    const selectedTestName = document.getElementById("testNameHistorySelect").value;
    const selectedHand = document.getElementById("handSelect").value;

    // Initialize an object to store statistics for graphing
    const stats = {};
    let qrows = "";

    let maxBPM = 0;
    let minBPM = 10000; // higher than humanly possible
    let firstMonth = '';
    let lastMonth = '';

    // Loop through the runHistory object and populate the table
    let totReps = 0;
    let totNfail = 0;
    let totElapsed = 0;
    let streakGraphBPM = [];


    for (const runName in runHistory) {
        const runData = runHistory[runName];
        const [date, preset, hand] = runName.split("|");

        // Date range filtering logic
        if (dateRange === "1Month" && !isWithinLastMonths(date, 1)) continue;
        if (dateRange === "3Months" && !isWithinLastMonths(date, 3)) continue;
        if (dateRange === "1Year" && !isWithinLastMonths(date, 12)) continue;

        // Test name filtering logic
        if (selectedTestName !== "all" && selectedTestName !== preset) continue;

        // Hand filtering logic
        if (selectedHand !== "any" && selectedHand !== hand) continue;

        const [year, month, day] = date.split('-');
        const datedisp = year + "-" + month;
        if (firstMonth === '') {
          firstMonth = date;
        }
        lastMonth = date; // this will keep overwriting until it is really the last one

        // Initialize the monthly statistics if not already done
        if (!stats[date]) {
            stats[date] = {
                avgBPM: 0,
                bestBPM: 0,
                maxBPM: 0,
                streakBPM: 0
            };
        }

        // Update the monthly statistics
        stats[date].avgBPM = runData.sumBPM / (runData.success>0?runData.success:1);
        stats[date].bestBPM = runData.bestBPM;
        stats[date].maxBPM = runData.maxBPM;
        stats[date].notefail = percent(runData.notefail, runData.count);

        // Update maxBPM
        maxBPM = Math.max(
            maxBPM,
            stats[date].bestBPM,
            stats[date].maxBPM,
            stats[date].avgBPM
        );

        // zero bpm just about always just indicates a lack of data so don't count that for purposes of graphing
        if (stats[date].bestBPM)
          minBPM = Math.min(minBPM, stats[date].bestBPM);
        if (stats[date].maxBPM)
          minBPM = Math.min(minBPM, stats[date].maxBPM);
        if (stats[date].avgBPM)
          minBPM = Math.min(minBPM, stats[date].avgBPM);

        const newRow = document.createElement("tr");
        let acc = "&nbsp;";
        if (typeof runData.goodNotes !== 'undefined' && runData.goodNotes !== null) {
          acc = (100*runData.goodNotes/Math.max(runData.goodNotes+runData.notefail,1)).toFixed(2);
          qrows += `<td>${acc}%</td>`;
        }

        let errmaplink = "";
        if (isAvail(runData.errorNotes)) {
          errmaplink = "<div onclick=\"showErrorMap('"+runName+"');\" onmouseover='this.style.backgroundColor=\"white\"' onmouseout='this.style.backgroundColor=\"rgb(238,238,238)\"' style=color:blue;>SHOW</span>";
        }
        let streak = "";
        if (isAvail(runData.maxStreak)) {
          let streakbpm = [0,0,0,0];
          for (let i = 0; i < 4; i++) {
            if (isAvail(runData.maxStreak10BPM) && isAvail(runData.maxStreak10BPM[i])) {
              streakbpm[i] = Math.trunc(runData.maxStreak10BPM[i]);
            } else if (isAvail(runData.maxStreakBPM) && isAvail(runData.maxStreakBPM[i])) {
              streakbpm[i] = Math.trunc(runData.maxStreakBPM[i]/(runData.maxStreak[i]?runData.maxStreak[i]:1));
            }
          }
          streak = "<div style=font-size:x-small>"+
                    "<span style=color:green>" + avail(runData.maxStreak[0],0)+"/"+
                      streakbpm[0]+"&nbsp;</span>"+
                    "<span style=color:blue>" +avail(runData.maxStreak[1],0)+"/"+
                      streakbpm[1]+"&nbsp;</span>"+
                    "<span style=color:orange>" +avail(runData.maxStreak[2],0)+"/"+
                      streakbpm[2]+"&nbsp;</span>"+
                    "<span style=color:red>" +avail(runData.maxStreak[3],0)+"/"+
                      streakbpm[3]+"</span>"+
                    "</div>";
          stats[date].streakBPM = streakbpm[2];
        }

        newRow.innerHTML = `
            <td>${date}</td>
            <td>${preset}</td>
            <td>${hand}</td>
            <td>${runData.success}</td>
            <td>${runData.notefail} (${percent(runData.notefail, runData.count)}%)</td>
            <td>${(runData.elapsed/1000).toFixed(1)}</td>
            <td>${(runData.sumStrikes / runData.success).toFixed(2)}</td>
            <td>${acc}</td>
            <td>${errmaplink}</td>
            <td>${streak}</td>
            <td>${Math.trunc(runData.sumBPM / runData.success)}</td>
            <td>${runData.maxBPM}</td>
            <td>${runData.bestBPM}</td>

        `;

        totReps += runData.success;
        totNfail += runData.notefail;
        totElapsed += (runData.elapsed/1000);

        if (typeof runData.numQBPM !== 'undefined' && runData.numQBPM !== null) {
            let qrows = "";
            let sum = 0;
            for (let q = 0; q < 4; q++) {
              if (typeof runData.numQBPM[q] !== 'undefined' && runData.numQBPM[q] !== null) {
                sum += runData.numQBPM[q];
              } else {
                runData.numQBPM[q] = 0;
              }
            }
            if (sum === 0) sum = 1;  // avoid div by zero errors
            for (let q = 0; q < 4; q++) {
              qrows += `<td>${percent(runData.numQBPM[q], sum)}%</td>`;
            }
            newRow.innerHTML += qrows;
        }

        historyTableBody.appendChild(newRow);
    }

    const sumRow = document.createElement("tr");

    sumRow.innerHTML += "<td colspan=3 style=text-align:left;font-weight:bold>TOTALS</td>" +
                        "<td style=text-align:left;font-weight:bold>"+totReps+"</td>" +
                        "<td style=text-align:left;font-weight:bold>"+totNfail+" ("+percent(totNfail, (totNfail+totReps))+"%)"+"</td>" +
                        "<td style=text-align:left;font-weight:bold>"+formatTime(totElapsed)+"</td>";
    historyTableBody.appendChild(sumRow);

    maxBPM = Math.ceil(maxBPM/20)*20;  // round nearest 20
    minBPM = Math.floor(minBPM/20)*20;  // round nearest 20

    // Call the graphing function with the required parameters
    if (selectedTestName !== "all" && selectedHand !== "any") {
      drawHistoryGraph(stats, firstMonth, lastMonth, maxBPM, minBPM);
    }

    const hist = document.getElementById('historyGraph');
    if (hist) {
      const rect = hist.getBoundingClientRect();
      const top = rect.top + window.scrollY - 3;
      hist.scrollTo({
        top: top,
        behavior: 'smooth'
      });
    }
}

// Show streak data (not yet implemented)
function showStreakData(name) {
  alert("Not yet implemented");
}

// Show error map for a specific run
function showErrorMap(name) {
  console.log("SHOW ERROR MAP "+name);
  document.getElementById("errorMapContainer").style.display = "block";
  updateDisplayedNotesToPlay(true);
}

// Draw history graph with BPM and error data
function drawHistoryGraph(stats, firstMonth, lastMonth, maxBPM, minBPM) {

  if (maxBPM === 0) {
    maxBPM = 1; // avoid div by 0 errors, the graph is pathologic in this case anyway.
  }
  // Get the canvas context
  const canvas = document.getElementById("historyGraph");
  const ctx = canvas.getContext("2d");
  const canvasErr = document.getElementById("historyGraphErr");
  const ctxErr = canvasErr.getContext("2d");

  // Set canvas dimensions from actual size as rendered in html
  const s = getComputedStyle(canvas);
  canvas.width = parseInt(s.width);
  canvas.height = parseInt(s.height);
  ctx.font = "10px Arial";

  const se = getComputedStyle(canvasErr);
  canvasErr.width = parseInt(se.width);
  canvasErr.height = parseInt(se.height);
  ctxErr.font = "10px Arial";

  // Set up colors and styles
  ctx.fillStyle = "#BBB"; // Background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";

  ctxErr.fillStyle = "#BBB"; // Background color
  ctxErr.fillRect(0, 0, canvasErr.width, canvasErr.height);

  ctxErr.lineWidth = 2;
  ctxErr.strokeStyle = "white";
  ctxErr.fillStyle = "white";
  ctxErr.textAlign = "left";

  let [fyear,fmonth,fday] = firstMonth.split('-');
  if (fday >= 22) {
    fday = 22;
  } else if (fday >= 15) {
    fday = 15;
  } else if (fday >= 7) {
    fday = 7;
  } else {
    fday = "01";
  }
  let [lyear,lmonth,lday] = lastMonth.split('-');
  lmonth=parseInt(lmonth);
  if (lday < 7) {
    lday = 7;
  } else if (lday < 15) {
    lday = 15;
  } else if (lday < 22) {
    lday = 22;
  } else if (lday <= 28) {
    if (lmonth == 2) {
      console.log("lmonth==2:"+lmonth);
      lday = 28 + (((lyear%4) === 0)?1:0);
    } else if (lmonth == 3 || lmonth == 4 || lmonth==6||lmonth==9||lmonth==11) {
      lday = 30;
    } else {
      lday = 31;
    }
  }

  const firstday = dateToDaysSince1970(fyear+"-"+fmonth+"-"+fday);
  const lastday = dateToDaysSince1970(lyear+"-"+lmonth+"-"+lday);
  const totdays = lastday-firstday;

  const graphAxisHorizontalMargin = 55; // pixels to leave for axis and labels
  const graphAxisVerticalMargin = 25;
  const graphAxisVerticalMarginErr = 8;

  const xScale = (canvas.width-2*graphAxisHorizontalMargin) / totdays;
  const yScale = (canvas.height-2*graphAxisVerticalMargin) / (maxBPM-minBPM);

  const xScaleErr = (canvasErr.width-2*graphAxisHorizontalMargin) / totdays;
  const yScaleErr = (canvasErr.height-2*graphAxisVerticalMarginErr) / (100);

  // Draw horizontal and vertical axes
  ctx.beginPath();
  ctx.moveTo(graphAxisHorizontalMargin, canvas.height-graphAxisVerticalMargin);
  ctx.lineTo(canvas.width-graphAxisHorizontalMargin, canvas.height-graphAxisVerticalMargin);
  ctx.moveTo(graphAxisHorizontalMargin, graphAxisVerticalMargin);
  ctx.lineTo(graphAxisHorizontalMargin, canvas.height-graphAxisVerticalMargin);
  ctx.stroke();

  ctx.lineWidth = 2;

  // Draw labels on the horizontal axis
  for (let year = fyear, month = fmonth, day = fday;
       parseInt(year) < parseInt(lyear) ||
         ( parseInt(year) == parseInt(lyear) && parseInt(month) <= parseInt(lmonth) );
     ) {
    const x = graphAxisHorizontalMargin + (dateToDaysSince1970(year+'-'+month+'-'+day) - firstday)*xScale;
    ctx.textAlign = 'center';
    ctx.fillText(year+'-'+month+'-'+day, x, canvas.height - graphAxisVerticalMargin/2);

    ctx.moveTo(x, graphAxisVerticalMargin);
    ctx.lineTo(x, canvas.height-graphAxisVerticalMargin);
    ctx.stroke();

    ctxErr.moveTo(x, graphAxisVerticalMarginErr);
    ctxErr.lineTo(x, canvasErr.height-graphAxisVerticalMarginErr);
    ctxErr.stroke();

    // increment date by varying amounts depending on total timespan.
    if (day < 15) {
      day = 15;
    } else {
      day = "01";
      month++;
      if (month > 12) {
        month = "01";
        year++;
      }
    }
  }

  // draw labels for bpm
  ctx.strokeStyle = "#444";
  ctx.lineWidth = "1";
  ctx.textBaseline = "middle";
  let bpmIncrement = 20;
  if (maxBPM - minBPM > 1600) {
    bpmIncrement = 200;
  } else if (maxBPM-minBPM > 1000) {
    bpmIncrement = 100;
  } else if (maxBPM - minBPM > 400) {
    bpmIncrement = 50;
  }
  for (let bpm = minBPM; bpm <= maxBPM; bpm += bpmIncrement) {
    const y = canvas.height - graphAxisVerticalMargin - (bpm-minBPM)*yScale;
    ctx.textAlign = "right";
    ctx.fillText(bpm+' ', graphAxisHorizontalMargin, y);
    ctx.moveTo(graphAxisHorizontalMargin, y);
    ctx.lineTo(canvas.width-graphAxisHorizontalMargin, y);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillText(bpm, canvas.width-graphAxisHorizontalMargin, y);
  }

  // draw labels on the Error graph vertical axis
  ctxErr.strokeStyle = "#611";
  ctxErr.fillStyle = "#B11";
  ctxErr.lineWidth = "1";

  let perYScale = (canvasErr.height-2*graphAxisVerticalMarginErr) / (50);
  ctxErr.textBaseline = "middle";
  for (let per = 0; per <= 50; per += 10) {
    const y = canvasErr.height - graphAxisVerticalMarginErr - per*perYScale;
    ctxErr.textAlign = "left";
    ctxErr.fillText(per+'% ', canvasErr.width-graphAxisHorizontalMargin+3, y);
    ctxErr.textAlign = "right";
    ctxErr.fillText(per+'% ', graphAxisHorizontalMargin-3, y);
    ctxErr.moveTo(graphAxisHorizontalMargin, y);
    ctxErr.lineTo(canvasErr.width-graphAxisHorizontalMargin, y);
    ctxErr.stroke();
  }

  // give color code
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#AAFF00";
  ctx.fillText("BestBPM", graphAxisVerticalMargin*2, graphAxisVerticalMargin/2);
  ctx.fillStyle = "#0096FF";
  ctx.fillText("AvgBPM", graphAxisVerticalMargin*5, graphAxisVerticalMargin/2);
  ctx.fillStyle = "#BF40BF";
  ctx.fillText("MaxBPM", graphAxisVerticalMargin*8, graphAxisVerticalMargin/2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("StreakBPM", graphAxisVerticalMargin*11, graphAxisVerticalMargin/2);
  ctx.fillStyle = "#FF0000";
  ctx.fillText("NoteFail", graphAxisVerticalMargin*16, graphAxisVerticalMargin/2);

  // Plot lines for Average BPM (blue), Best BPM (green), and Max BPM (purple)
  const colors = ["#0096FF", "#AAFF00", "#BF40BF", "#FFFFFF"];
  const dataKeys = ["avgBPM", "bestBPM", "maxBPM", "streakBPM"];

  ctx.lineWidth = "3";

  for (let i = 0; i < dataKeys.length; i++) {
    ctx.strokeStyle = colors[i];
    ctx.beginPath();

    let firstkey = true;
    for (const key in stats) {
      if (stats.hasOwnProperty(key)) {
          if (stats[key][dataKeys[i]] === 0) {
            continue; // don't graph 0 bpm data points, they represent a lack of data not actual data
          }
          const x = graphAxisHorizontalMargin + (dateToDaysSince1970(key) - firstday) * xScale + 2*i;
          const y = canvas.height - graphAxisVerticalMargin - (stats[key][dataKeys[i]]-minBPM) * yScale;
          if (firstkey) {
            ctx.moveTo(x, y);
            firstkey = false;
          } else {
            ctx.lineTo(x, y);
          }
      }
    }

    ctx.stroke();

    for (const key in stats) {
      if (stats.hasOwnProperty(key)) {
          if (stats[key][dataKeys[i]] === 0) {
            continue; // don't graph 0 bpm data points, they represent a lack of data not actual data
          }
          const x = graphAxisHorizontalMargin + (dateToDaysSince1970(key) - firstday) * xScale + 2*i;
          const y = canvas.height - graphAxisVerticalMargin - (stats[key][dataKeys[i]]-minBPM) * yScale;
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.moveTo(x, y - 4); // Move to the top point
          ctx.lineTo(x + 4, y); // Line to the right point
          ctx.lineTo(x, y + 4); // Line to the bottom point
          ctx.lineTo(x - 4, y); // Line to the left point
          ctx.closePath(); // Close the path to complete the diamond
          ctx.fill(); // Fill the diamond
      }
    }
  }

  // draw the notefail data
  let first = true;
  ctxErr.lineWidth = 3;
  ctxErr.strokeStyle = "rgba(255,0,0,0.5)";
  ctxErr.setLineDash([4,4]);
  ctxErr.lineDashOffset = 0;
  ctxErr.beginPath();

  for (const date in stats) {
    if (!stats.hasOwnProperty(date)) {
      continue;
    }
    const x = graphAxisHorizontalMargin + (dateToDaysSince1970(date) - firstday) * xScale;
    const y = canvasErr.height - graphAxisVerticalMarginErr - (stats[date].notefail) * perYScale;

    if (first) {
      ctxErr.moveTo(x, y);
      first = false;
    } else {
      ctxErr.lineTo(x, y);
    }
  }
  ctxErr.stroke();
  ctxErr.setLineDash([]);

  ctxErr.fillStyle = "rgba(255,0,0,0.5)";

  for (const date in stats) {
    if (!stats.hasOwnProperty(date)) {
      continue;
    }
    const x = graphAxisHorizontalMargin + (dateToDaysSince1970(date) - firstday) * xScale;
    const y = canvasErr.height - graphAxisVerticalMarginErr - (stats[date].notefail) * perYScale;
     ctxErr.beginPath();
     ctxErr.moveTo(x, y - 4); // Move to the top point
     ctxErr.lineTo(x + 4, y); // Line to the right point
     ctxErr.lineTo(x, y + 4); // Line to the bottom point
     ctxErr.lineTo(x - 4, y); // Line to the left point
     ctxErr.closePath(); // Close the path to complete the diamond
     ctxErr.fill(); // Fill the diamond
  }
}

// Check if a date is within the last 'n' months
function isWithinLastMonths(dateString, n) {
    const currentDate = new Date();
    const date = new Date(dateString);
    const diff = currentDate - date;
    const monthDiff = diff / (1000 * 60 * 60 * 24 * 30.44); // Approximate average days in a month

    return monthDiff <= n;
}

// Convert date string to days since 1970
function dateToDaysSince1970(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 2) {
      parts[2] = 1;
      console.log("auto added 01 day to date");
    } else if (parts.length !== 3) {
        throw new Error("Invalid date format. '"+dateString+"' Use yyyy-mm-dd.");
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JavaScript
    const day = parseInt(parts[2], 10);

    const inputDate = new Date(year, month, day);
    const januaryFirst1970 = new Date(1970, 0, 1); // January is month 0

    // Calculate the difference in milliseconds and convert to days
    const daysDifference = Math.floor((inputDate - januaryFirst1970) / (24 * 60 * 60 * 1000));

    return daysDifference;
}

// Import/export history interface
function importExportHistory() {
  animateOpen('importExportContainer');

  const hist = JSON.stringify(runHistory);
  document.getElementById('importExportTextarea').value = hist;
  document.getElementById('importExportSizeDiv').innerHTML = "Bytes: "+hist.length;

  setTimeout(function() {
    document.getElementById("historyGraph").scrollIntoView({ behavior: "smooth", block: "end" });
  }, 1200);
}
