"use strict";

// Day Chart module - displays daily practice statistics and activity

function showDayChart() {

  animateOpen("dayChartContainer");

  const today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // getMonth() is zero-based
  let dd = today.getDate();

  // Pad single digit month and day values with a leading zero
  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;

  const formattedToday = `${yyyy}-${mm}-${dd}`;
  document.getElementById('dayChartDatePicker').value = formattedToday;

  computeDayChart();
}

function updateDayChartNote(event) {
  event.preventDefault();

  const text = document.getElementById("dayChartNoteTextArea").value;
  const date = document.getElementById("dayChartDatePicker").value;

  console.log("updateDayChartNote: date:"+date+" text=/"+text+"/");

  runHistory[".PREF.DAYCHARTNOTE."+date] = text;
  saveRunHistory();
  document.getElementById("dayChartNoteDisplay").innerHTML = "NOTE: "+text;
}

function dayChartDate(days) {
  console.log("Adjusting dayChart Date by " + days);

  // Get 'today' but reset time to start of the day for comparison
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Get the current date from the picker, without time
  const datePicker = document.getElementById("dayChartDatePicker");
  const currentDate = datePicker.value; // YYYY-MM-DD format

  // Create a new date object based on the current date picker value
  let current = new Date(currentDate);
  current.setHours(23, 59, 59, 999); // Ensure time is at start of day to avoid timezone issues

  // Create a new date representing the adjusted date
  let adjustedDate = new Date(current);
  adjustedDate.setDate(adjustedDate.getDate() + days);

  // Comparison to ensure adjustedDate does not exceed 'today'
  if (adjustedDate <= today) {
    datePicker.value = adjustedDate.toISOString().split('T')[0];
    computeDayChart();
  } else {
    console.log("Adjusted date exceeds the current date. No change applied.");
  }
}


    function setDayChartNote(date) {
        const text = avail(runHistory[".PREF.DAYCHARTNOTE."+date], "");
        document.getElementById("dayChartNoteTextArea").value = text;
        document.getElementById("dayChartNoteDisplay").innerHTML = text;
    }

    function computeDayChart() {
      console.log("###computeDayChart");
      const statsTable = document.getElementById("dayChartOverviewTable");
      const today = document.getElementById("dayChartDatePicker").value; //getToday(); // in yyyy-mm-dd format

      console.log("DAY CHART "+today);

      setDayChartNote(today);

      if (runHistory === null) {
        loadRunHistory();
      }
      // find all the runs that happened today

      let pr = "";  // will contain all the html for the chart.
      let qualCounts = {};
      let timeCats = { // track different categories of practice time
        scaleArp: 0,
        drill: 0,
        repertoire: 0,
        freePlay: 0,
        misc: 0
      };

      let totals = {
        elapsed: 0,
        reps: 0,
        fail: 0,
        freereps: 0
      }

      let personalBestCount = 0;

      for (const key in runHistory) {
        if (!runHistory.hasOwnProperty(key)) {
          continue;
        }
        if (key.startsWith(".PREF.")) {
          //console.log("Skipped PREF:"+key);
          continue;
        }

        if (runHistory[key].reps < 3 || runHistory[key].elapsed < 10000) {
          // very few reps or less than 10 seconds of practice time that day,
          // this is usually just an error like selected wrong number of octaves and didn't realize it
          // so don't bother showing it on the day chart.
          continue;
        }

        const [date, preset, hand] = key.split("|");

        //console.log("DAYCHART date=["+date+"]");

        if (date !== today) {
          continue;
        }
        //console.log("DAYCHART FOUND A RECORD");
        if (runHistory[key].isFreePlay) {
          // free play items have far less data
          pr += "<tr style=text-align:center>";
          pr += "<td style=text-align:left;background-color:beige;color:purple>"+preset+"</td>";
          pr += "<td></td>";
          const elapse = Number((runHistory[key].elapsed/1000).toFixed(1));
          totals.elapsed += elapse;
          totals.freereps += runHistory[key].count;

          const fp = freePlay.find(item => item.name === preset.replace("Free Play:",""));
          //console.log("Looking up freeplay item:"+preset+" result:"+fp+" "+avail(fp.category,"unknown cat"));
          if (isAvail(fp)) {
            timeCats[fp.category] += elapse;
          } else {
            timeCats.freePlay += elapse;
          }

          pr += "<td style=color:purple>"+(formatTime(elapse))+"</td>";
          pr += "<td></td><td></td><td style=color:purple>"+runHistory[key].count+
            "</td><td></td><td></td><td></td><td></td><td></td>";
          pr += "</tr>";

          continue;
        }

        const acc = percent(runHistory[key].success, runHistory[key].count);
        const streak = runHistory[key].maxStreak[2];
        const streakbpm = Math.trunc(
          0.5+avail(runHistory[key].maxStreakBPM,[0,0,0,0])[2]/nonZero(runHistory[key].maxStreak[2])
        );
        const avgbpm = Math.trunc(runHistory[key].sumBPM/nonZero(runHistory[key].count));
        const maxbpm = Math.trunc(runHistory[key].maxBPM);
        const bestbpm = Math.trunc(runHistory[key].bestBPM);
        const targetbpm = avail(runHistory[key].targetBPM, findTargetBPM(preset));
        const streak10 = avail(runHistory[key].maxStreak10BPM,[0,0,0,0])[2];

        totals.reps += runHistory[key].success;
        totals.fail += runHistory[key].notefail;

        let presetNoOct = preset;
        if (presetNoOct.endsWith(' Oct)')) {
          presetNoOct = presetNoOct.slice(0,-8);
        }
        presetNoOct = presetNoOct.replace(/ B[0-9]+(-[0-9]+)?$/, '');
        let pcat = presets.find(item =>
                typeof item !== 'string' && item.name && item.name.startsWith(presetNoOct));
        if (pcat === null) {
          alert("pcat null. preset="+preset+" presetnooct="+presetNoOct);
        }
        let cat = pcat?avail(pcat.category,"misc"):"misc";
        if (pcat === "misc") {
          alert("pcat misc: cat="+pcat.category7);
        }
        //console.log("PRESETFIND: initial cat="+cat+" for preset=/"+presetNoOct+"/");

        const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(preset)], "begin");

        let evals = evaluateSessionStats(acc, streak, streakbpm,
                      avgbpm, maxbpm, bestbpm, targetbpm,
                      0, schedule, avail(runHistory[key].maxStreakAtEnd[2],false));

        const trophy = (runHistory[key].personalBest)?
            (" <i class=\"fa-solid fa-trophy\" style=font-size:10px title='personal best streak bpm'></i> "):"";

        personalBestCount += runHistory[key].personalBest?1:0;

        pr += "<tr style=text-align:center>";
        pr += "<td style=text-align:left;color:"+evals.overallColor+
                ";background-color:"+evals.overallBGColor+";font-weight:"+evals.overallEmph+">"+
                trophy+evals.overallSymbol+preset+"</td>";
        pr += "<td>"+hand+"</td>";

        let elapse = Number((runHistory[key].elapsed/1000).toFixed(1));
        // To be fair as far as estimated effective practice time, you have to give the learner
        // a reasonable amount of rest time between runs. We will estimate this as 3 beats (per run) and use
        // averageBPM as the measure of the length of these beats.
        if (avail(avgbpm,0) > 0) {
          //console.log("Elapse before rest:"+elapse);
          elapse += 3*Number(runHistory[key].count)*(60/avgbpm); // rest time allowed between runs
          //console.log("Added rest time:"+elapse);
        }
        elapse = Number(elapse);
        totals.elapsed += elapse;

        if (!isAvail(timeCats[cat])) {
          timeCats[cat] = 0;
        }
        timeCats[cat] += elapse;
        //console.log("PRESETFIND: timecat using:"+cat+" timeCats[cat]="+timeCats[cat]);

        pr += "<td>"+(formatTime(elapse))+"</td>";
        pr += "<td style=color:"+evals.accColor+">"+acc+"%</td>";
        pr += "<td style=color:"+evals.streakColor+";text-align:left>"+
              trophy +
              runHistory[key].maxStreak[2]+" @ ";
        pr += "<span style=color:"+evals.streakbpmColor+">"+streakbpm+
              ((streak10>streakbpm)?("</span><span style=font-size:x-small> ("+streak10+")"):"")+"</span>"+
              "</td>";
        //console.log("STREAKPR: "+key+" streak10:"+streak10+" strbpm:"+streakbpm);
        pr += "<td>"+runHistory[key].success+"</td>";
        pr += "<td>"+runHistory[key].notefail+"</td>";
        pr += "<td><span style=color:"+evals.avgbpmColor+">"+avgbpm+"</span></td>";
        pr += "<td><span style=color:"+evals.maxbpmColor+">"+runHistory[key].maxBPM+"</span></td>";
        pr += "<td><span style=color:"+evals.bestbpmColor+">"+runHistory[key].bestBPM+"</span></td>";
        pr += "<td>"+targetbpm+"</td>";

        pr += "</tr>";

        if (!isAvail(qualCounts[evals.overallColor])) {
          qualCounts[evals.overallColor] = {
            count: 0,
            strikes: evals.overallStrikes,
            symbol: evals.overallSymbol,
            label: evals.overallLabel
          }
        }
        qualCounts[evals.overallColor].count++;

      }  // end of for key in runHistory

      if (totals.elapsed == 0) {
        pr = "<tr><td colspan=11><div style=padding:20px;font-size:x-large><em>There is no practice data on the chosen date.</em></div></td></tr>";
      } else {
        // totals row
        pr += "<tr style=font-weight:bold;text-align:center;background-color:beige><td colspan=2 style=text-align:left>Totals:</td><td>"+formatTime(avail(totals.elapsed,0))+"</td>";

        if (totals.reps === 0 && totals.freereps > 0) {
          pr += "<td style=border:none></td>";
          pr += "<td style=border:none></td><td>"+(totals.freereps)+"</td><td colspan=5 style=border:none></td>";
        } else {
          pr += "<td>"+Math.trunc(0.5+100*totals.reps/(totals.reps+totals.fail+0.000001))+"%</td>";
          pr += "<td style=border:none></td><td>"+(totals.reps+totals.freereps)+"</td><td>"+totals.fail+"</td><td colspan=4 style=border:none></td>";
        }

        pr += "</tr>";
      }

      document.getElementById("dayChartTbody").innerHTML = pr;

      const timesum = document.getElementById("dayChartTimeSummaryDiv");

      if (totals.elapsed != 0) {
        pr = "<strong>Total&nbsp;Time: "+formatTime(totals.elapsed)+"</strong><br><br>";
        pr += "<table id=dayChartTimeSummary border=1 >";
        pr += "<tr style=border:none><th colspan=2>Time Breakdown</th></tr>";
        if (timeCats['scaleArp'] !== 0) {
          pr += "<tr style=border:none><td style=border:none>Scales/Arps:</td><td style=border:none;text-align:right>"+formatTime(timeCats['scaleArp'])+"</td></tr>";
        }
        if (timeCats['drill'] !== 0) {
          pr += "<tr style=border:none><td style=border:none>Other Drills:</td><td style=border:none;text-align:right>"+formatTime(timeCats['drill'])+"</td></tr>";
        }
        if (timeCats['repertoire'] !== 0) {
          pr += "<tr style=border:none><td style=border:none>Repertoire:</td><td style=border:none;text-align:right>"+formatTime(timeCats['repertoire'])+"</td></tr>";
        }
        if (timeCats['freePlay'] !== 0) {
          pr +=   "<tr style=border:none><td style=border:none>Misc. Free Play:</td><td style=border:none;text-align:right>"+formatTime(timeCats['freePlay'])+"</td></tr>";
        }
        if (timeCats['misc'] !== 0) {
          pr += "<tr style=border:none><td style=border:none>Misc:</td><td style=border:none;text-align:right>"+formatTime(timeCats['misc'])+"</td></tr>";
        }
        //pr += "<tr style=border:none><th style=border:none>Total Time:</th><th style=border:none;text-align:right>"+formatTime(totals.elapsed)+"</th></tr>"+
        pr += "</table>";
        timesum.innerHTML = pr;
      } else {
        if (timesum) {
          timesum.innerHTML = '';
        }
      }

      pr = "<p style=color:darkgreen><strong><i class=\"fa-solid fa-trophy\"></i> Personal Bests: "+
        personalBestCount+"</p>";
      document.getElementById("personalBestDiv").innerHTML = pr;

      pr = "<tr>";
      let totqual = 0;
      for (const key in qualCounts) {
        if (qualCounts.hasOwnProperty(key)) {
          totqual += qualCounts[key].count;
        }
      }
      //console.log("Totqual="+totqual);

      const arr = Object.keys(qualCounts).map(key => {
        return {
          key:key,
          count: qualCounts[key].count,
          strikes: qualCounts[key].strikes,
          symbol: qualCounts[key].symbol,
          label: qualCounts[key].label
        };
      });

      arr.sort((a,b) => a.strikes-b.strikes);

      const piedata = {
        datasets: [
          {
            data: [],
            backgroundColor: []
          }
        ]
      };

      for (let i = 0; i < arr.length; i++) {
        if (arr[i].count == 0) {
          continue;
        }

        piedata.datasets[0].data.push(arr[i].count);

        pr += "<tr style=border:none><td style=border:none;background-color:"+arr[i].key+";width:1.5em;text-align:center><span style=color:white>"+ arr[i].symbol + "</span></td>"+
              "<td style=border:none;color:"+arr[i].key+">"+arr[i].label+"</td>"+
              "<td style=border:none>"+arr[i].count+"</td>"+
              "<td style=border:none>("+
              percent(arr[i].count, totqual)+
              "%)</td></tr>";

        piedata.datasets[0].backgroundColor.push(arr[i].key);

      }
      statsTable.innerHTML = pr;

      // pie chart of results

      const piecanvas = document.getElementById("dayChartPieCanvas");
      const ctx = piecanvas.getContext("2d");

      if (dayChartPie !== null) {
        dayChartPie.destroy();
      }

      console.log("Creating daychart pie");
      dayChartPie = new Chart(ctx, {
        type: 'pie',
        data: piedata,
      });



    } // end of computeDayChart()

function nonZero(n) {
  n = avail(n, 1);
  return n?n:1;
}
