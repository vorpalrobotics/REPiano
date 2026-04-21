"use strict";

// Skill Map module - generates and displays the practice skill map

function showSkillMap() {
  animateOpen("skillMapContainer");
  generateSkillMap();
  if (whiteNoiseStarted === false) {
    whiteNoiseStarted = true;
    startWhiteNoise(0.02);
    warning("White noise started");
  }
}

function generateSkillMap() {
  console.log("###generateSkillMap");

  let latestPracticeDate = "2000-01-01";

  totalReps = {}; // zero out all total reps, we'll recompute as we go through
  const scaleData = [];
  const repData = {};
  const drillData = {};
  const freeplayData = {};
  const count = {}; // count which scales/arps were actually practiced

  if (runHistory === null) {
    loadRunHistory();
  }
  // generate a hash of recent dates data only (past 180 days max)
  // this will speed things up considerably and allows looking at most recent
  // days first.
  const date180 = todayDate(180); // a formatted string for 100 days ago in the format that runHistory keys use
  const latestDate = {}; // keep track of the latest date data found

  for (const key in runHistory) {
    if (!runHistory.hasOwnProperty(key)) {
      continue;
    }
    if (key.startsWith(".PREF.")) {
      continue;
    }

    const [date, preset, hand] = key.split("|");

    if (date > latestPracticeDate) {
      latestPracticeDate = date;
    }

    if (hand === 'both') {
      // for now only count reps for HT practice
      if (!isAvail(totalReps[preset])) {
        totalReps[preset] = 0;
      }
      totalReps[preset] += avail(runHistory[key].success, 0); // keep total reps for all items to help in display
    }

    if (date <= "2024-02-19") {
      continue; // there was a bug before this date that corrupted the notescope so it's not possible to use these for presets.
    }

    let datekey = preset;
    if (datekey.endsWith(' Oct)')) {
      datekey = datekey.slice(0,-7);
    }

    if (date < date180) {
      // date too old to matter for skill map
      continue;
    }

    let needdatewipe = false;

    if (avail(latestDate[datekey],"2000-01-01") > date) {
      // already have a later date
      continue;
    } else if (avail(latestDate[datekey],"2000-01-01") < date) {
      // in this case you have to wipe out any prior octave based data for
      // this preset as they are all earlier dates.
      needdatewipe = true;
    } else {
      // the current date is equal to prior dates for the current preset so
      // if it's a different octave that's ok, they're the same date
    }

    latestDate[datekey] = date;

    const p = "^(.*?)( B([0-9]+)(-([0-9]+))?)?$";
    const pattern = new RegExp(p);

    // IMPLEMENT: for now we'll just hard code some common ones, but a better method would be to
    // go through all the possible scales and find the ones that exist in the runhistory, then suppress
    // rows for ones that have no examples.
    if (preset.includes(" maj Scale ") || preset.includes(" natMin Scale ")
        || preset.includes(" chroma Scale ") || preset.includes(" minBlues Scale")
        || preset.includes(" majArp ") || preset.includes(" natMinArp ")) {

        let [tonic, sctype, scale, numoct, oct] = preset.split(" ");
        numoct = Number(numoct.substr(1));

        if (!isAvail(scaleData[sctype])) {
          scaleData[sctype] = [];
          needdatewipe = false; // it's new anyway, there's no prior data
        }
        if (!isAvail(scaleData[sctype][tonic]) || !isAvail(scaleData[sctype][tonic][numoct]) ||
            date > scaleData[sctype][tonic][numoct].date) {
          if (!isAvail(scaleData[sctype][tonic]) || needdatewipe) {
            scaleData[sctype][tonic] = [];
          }
          if (isAvail(scaleData[sctype][tonic][numoct]) && hand !== 'both') {
            continue; // we already have data with both hands for this octave
          }
          scaleData[sctype][tonic][numoct] = {
            preset: preset,
            date: date,
            octaves: numoct,
            hand: hand,
            days: daysSince(date),
            hist: runHistory[key]
          };
        }

      } else if (runHistory[key].isFreePlay === true) {
        freeplayData[preset] = {
          preset: preset,
          description: freePlayDescription(preset.replace(/^Free Play:/,'')),
          name: preset.replace(/^Free Play:/,''),
          noteScopeList: "-1,-1,-1,-1",
          date: date,
          prefname: ".PREF." + preset,
          days: daysSince(date),
          hist: runHistory[key]
        };

      } else { // not a scale or arp

        if (runHistory[key].count < 5) {
          continue; // skip data where there were not a significant number of runs
        }

        // repertoire items and drills
        let m = preset.match(pattern);
        if (m) {
          if (runHistory[key].count < 5) {
            // too few reps to count as a practice session
            continue;
          }
          if (!isAvail(repData[m[1]])) {
            repData[m[1]] = {};
          }
          if (m[1].startsWith("TEST")) {
            // don't display programming tests
            continue;
          }

          const precat = presetCategory(m[1]);

          if (precat !== "repertoire") {
            const dayssince = daysSince(date);
            if (isAvail(drillData[preset]) && drillData[preset].hand === 'both' &&
                drillData[preset].days === daysSince && hand !== 'both') {
              continue;  // already have a both-hands version of this drill
            }
            drillData[preset] = {
              preset: preset,
              name: preset,
              hand: hand,
              barRange: "", // drills are considered things generally practiced as a unit, at least mostly
              noteScopeList: "-1,-1,-1,-1",
              date: date,
              prefname: ".PREF." + preset,
              days: daysSince(date),
              hist: runHistory[key]
            };
            continue;
          }

          if (isAvail(repData[m[1]][m[2]]) && hand !== 'both') {
            continue; // already have a both hands version of this item
          }

          let ns = runHistory[key].noteScope;
          if (!isAvail(ns)) {
            ns = [{first:-1, last:-1}, {first:-1, last:-1}];
          }
          repData[m[1]][m[2]] = {
            preset: preset,
            name: m[1],
            hand: hand,
            barRange: (isAvail(m[2])?m[2].substring(1):null), // strip off the leading space
            noteScopeList: ns[0].first+","+
                            ns[0].last+","+
                            ns[1].first+","+
                            ns[1].last,
            date: date,
            prefname: ".PREF." + m[1] + " " + m[2],
            days: daysSince(date),
            hist: runHistory[key]
          };
        } // end of: if (m)
      }
    }

    // load data into the table
    const sctab = document.getElementById("skillMapTable");
    const tonics = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const scales = ["maj", "natMin", "chroma", "minBlues", "majArp", "natMinArp"];
    const rows = {};

    // IMPLEMENT: This should really drive off a table, preferably one of the tables that are already
    // in repiano that list different kinds of scales and arps

    rows["maj"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Major</th>";
    rows["natMin"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Minor</th>";
    rows["chroma"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Chromatic</th>";
    rows["minBlues"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Minor Blues</th>";
    rows["majArp"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Major</th>";
    rows["natMinArp"] = "<tr style=font-size:small><th style=background-color:darkgray;color:white;text-align:left>Minor</th>";
    rows["header"] = "<tr style=background-color:darkgray;color:white;font-size:small><td></td>";
    rows["repertoire"] = "";
    rows["freeplay"] = "";
    rows["drill"] = "";

    for (let s = 0; s < scales.length; s++) {
      count[scales[s]] = 0; // this will determine whether there is anything to show for a particular kind of scale
    }

    for (let i = 0; i < tonics.length; i++) {

      rows["header"] += "<th style=width:6.8vw;>"+ tonics[i] + "</th>";

      for (let s = 0; s < scales.length; s++) {

        if (!isAvail(scaleData[scales[s]])) {
          continue;
        }
        const alldata = scaleData[scales[s]][tonics[i]];
        if (!isAvail(alldata)) {
          rows[scales[s]] += "<td></td>";
          continue;
        }

        // for now just take the largest one, but should really display all by dividing up the cell somehow
        let dataocts = 1;
        let uninum = "";
        let uninumfmt = "";
        for (let octs = 1; octs <= 4; octs++) {
          let octcolor = "white";

          if (isAvail(scaleData[scales[s]][tonics[i]][octs])) {
            if (scaleData[scales[s]][tonics[i]][octs].hand !== 'both') {
              octcolor = "yellow";
            }
            uninum = "&#x"+(2460+octs-1)+";";
            uninumfmt += "<span style=color:"+octcolor+">"+uninum+"</span>";
            dataocts = octs;
            count[scales[s]]++;  // we found at least one of these kinds of scale.
          }
        }
        const data = scaleData[scales[s]][tonics[i]][dataocts];

        let streakbpm = 0;
        let streak = 0;

        if (isAvail(data.hist.maxStreakBPM) && isAvail(data.hist.maxStreakBPM[2]) &&
            isAvail(data.hist.maxStreak) && isAvail(data.hist.maxStreak[2])) {
              streak = data.hist.maxStreak[2];
              streakbpm = Math.trunc(0.5+avail(data.hist.maxStreakBPM[2],0)/(0.001+avail(data.hist.maxStreak[2],1)));
        }

        const acc = percent(data.hist.success, data.hist.count);
        const avgbpm = Math.trunc(data.hist.sumBPM/data.hist.count);
        const maxbpm = Math.trunc(data.hist.maxBPM);
        const bestbpm = Math.trunc(data.hist.bestBPM);
        const targetbpm = 0; // avail(data.hist.targetBPM, findTargetBPM(preset));

        const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(data.preset)], "begin");

        let evals = evaluateSessionStats(acc, streak, streakbpm, avgbpm, maxbpm, bestbpm, targetbpm,
                      data.days, schedule, avail(data.hist.maxStreakAtEnd[2], false));

        let color = evals.overallColor;
        let dayscolor = evals.ageColor;

        rows[scales[s]] += "<td onclick=\"gotoPreset('"+
        data.preset + "', document.getElementById('skillMapContainer'), null, 0, 0, 0, 0);\" "+
        "style=text-align:center;color:white;background-color:"+color+
        " title='Octaves: "+uninum+", Hand: "+data.hand+", Acc: "+
          acc+"%, Streak: "+streak+"@"+streakbpm+", Reps: "+avail(totalReps[data.preset],"0")+", Age: "+
          data.days+" day"+(data.days===1?"":"s")+"'>"+
          `<i id=learningScheduleIcon class="${learningScheduleIconName[schedule]}" style=font-size:10px></i>`+
          "<span style=font-weight:bold;>"+uninumfmt+"</span>&nbsp;"+
          "<span style=background-color:"+dayscolor+">"+
          data.days+"d</span> <span style=font-size:smaller>&#119046;"+avail(totalReps[data.preset],"")+"</span></td>";
      }
    }

    // Add repertoire items and drills

    // Iterate over all keys in repData
    const repkeys = Object.keys(repData);
    const barprecount = {};

    const needRowSpan = {};

    for (let k = 0; k < repkeys.length; k++) {
        if (!repData.hasOwnProperty(repkeys[k]) || repkeys[k].startsWith("TEST")) {
            continue; // tests never appear in this chart
        }

        const precat = presetCategory(repkeys[k]);

        if (precat !== "repertoire") {
          continue; // just handling repertoire for now
        }

        const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+
                            stripPresetModifiers(repkeys[k])], "begin");

        rows["repertoire"] += "<tr style=font-size:small><th id='SKILL_" + repkeys[k] +
          "' style=background-color:darkgray;color:white;text-align:left>" +
          `<i id=learningScheduleIcon class="${learningScheduleIconName[schedule]}"
            style=font-size:10px aria-hidden="true"></i> ` +
          repkeys[k] + "</th>";

        // Convert repData for the current key into an array of [key, value] pairs, and sort it
        // Adjusted sorting logic to handle single-bar formats
        const sortedRepDataArray = Object.entries(repData[repkeys[k]])
            .sort((a, b) => {
                // Extract numerical parts from the keys, e.g., "B2-8" becomes [2, 8] and "B3" becomes [3, 3] for sorting consistency
                const numPartsA = String(a[0]).substring(2).split("-");
                if (numPartsA.length === 1) numPartsA.push(numPartsA[0]); // Duplicate if only one part is found

                const numPartsB = String(b[0]).substring(2).split("-");
                if (numPartsB.length === 1) numPartsB.push(numPartsB[0]); // Duplicate if only one part is found

                // Compare the starting bars first
                if (Number(numPartsA[0]) !== Number(numPartsB[0])) {
                    return numPartsA[0] - numPartsB[0];
                }
                // If starting bars are the same, compare the ending bars
                return Number(numPartsA[1]) - Number(numPartsB[1]);
            });


        // Now iterate over the sorted array
        sortedRepDataArray.forEach(([key, value]) => {
            const fullkey = repkeys[k] + key;
            const p = avail(runHistory[".PREF." + fullkey], {favorite: false});
            if (!p.favorite) {
                return;
            }

            if (isAvail(barprecount[repkeys[k]])) {
                barprecount[repkeys[k]]++;
            } else {
                barprecount[repkeys[k]] = 1;
            }

            if (barprecount[repkeys[k]] > 1 && (barprecount[repkeys[k]] % 12) === 1) {
              rows["repertoire"] += "</tr><tr>";
              const skillkey = "SKILL_"+repkeys[k];
              if (!isAvail(needRowSpan[skillkey])) {
                needRowSpan[skillkey] = 1;
              }
              needRowSpan[skillkey]++;
            }

            const acc = percent(value.hist.success, value.hist.count);

            let streakbpm = 0;
            let streak = 0;

            if (isAvail(value.hist.maxStreakBPM) && isAvail(value.hist.maxStreakBPM[2]) &&
                isAvail(value.hist.maxStreak) && isAvail(value.hist.maxStreak[2])) {
                  streak = value.hist.maxStreak[2];
                  streakbpm = Math.trunc(0.5+avail(value.hist.maxStreakBPM[2],0)/(0.001+avail(value.hist.maxStreak[2],1)));
            }

            const avgbpm = Math.trunc(value.hist.sumBPM/value.hist.count);
            const maxbpm = Math.trunc(value.hist.maxBPM);
            const bestbpm = Math.trunc(value.hist.bestBPM);
            const targetbpm = 0; // avail(data.hist.targetBPM, findTargetBPM(preset));

            let evals = evaluateSessionStats(acc, streak, streakbpm, avgbpm, maxbpm, bestbpm, targetbpm,
                          value.days, schedule, avail(value.hist.maxStreakAtEnd[2]));

            let color = evals.overallColor;
            let dayscolor = evals.ageColor;

            rows["repertoire"] += "<td onclick=\"gotoPreset('"+
                value.name+ "',document.getElementById('skillMapContainer'),'"+
                value.barRange+"',"+value.noteScopeList+
                ")\" style=text-align:center;font-size:small;background-color:" +
                color + ";color:white;width:6.8vw title='Acc: "+
                acc+"%, Streak: "+streak+"@"+streakbpm+", Reps: "+avail(totalReps[fullkey],"0")+", Age: "+value.days+
                " day"+(value.days===1?"":"s")+"'>" + key + "<br>" +
                "<span style=color:white;background-color:" + dayscolor + ">" +
                value.days + "d</span> <span style=font-size:smaller>&#119046;"+
                avail(totalReps[fullkey],"")+"</span></td>";
        });
    }

    // drills

    // Iterate over all keys in drillData
    const drillArray = Object.values(drillData);
    drillArray.sort((a,b) => a.name.localeCompare(b.name));
    rows["drill"] += "<tr style=font-size:small><th id='SKILL_DRILLS' style=background-color:darkgray;color:white;text-align:left>Drills:</th>";

    for (let k = 0; k < drillArray.length; k++) {
        if (drillArray[k].preset.startsWith("TEST")) {
            continue;
        }

        const precat = presetCategory(drillArray[k].preset);

        if (precat !== "drill") {
          continue;
        }

        const value = drillArray[k];

        const acc = percent(value.hist.success, value.hist.count);
        let streakbpm = 0;
        let streak = 0;

        if (isAvail(value.hist.maxStreakBPM) && isAvail(value.hist.maxStreakBPM[2]) &&
            isAvail(value.hist.maxStreak) && isAvail(value.hist.maxStreak[2])) {
              streak = value.hist.maxStreak[2];
              streakbpm = Math.trunc(0.5+avail(value.hist.maxStreakBPM[2],0)/(0.001+avail(value.hist.maxStreak[2],1)));
        }
        const avgbpm = Math.trunc(value.hist.sumBPM/value.hist.count);
        const maxbpm = Math.trunc(value.hist.maxBPM);
        const bestbpm = Math.trunc(value.hist.bestBPM);
        const targetbpm = 0; // avail(data.hist.targetBPM, findTargetBPM(preset));

        const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(value.preset)], "begin");

        let evals = evaluateSessionStats(acc, streak, streakbpm, avgbpm, maxbpm, bestbpm, targetbpm,
                      value.days, schedule, avail(value.hist.maxStreakAtEnd[2]));

        let color = evals.overallColor;
        let dayscolor = evals.ageColor;

        rows["drill"] += "<td onclick=\"gotoPreset('"+
            value.name+ "',document.getElementById('skillMapContainer'),null)\" style=text-align:center;font-size:x-small;background-color:" +
            color + ";color:white;width:6.8vw title='Acc: "+acc+"%, Streak: "+streak+"@"+streakbpm+", Age: "+value.days+
            " day"+(value.days===1?"":"s")+"'>" +
            `<i id=learningScheduleIcon class="${learningScheduleIconName[schedule]}" style=font-size:10px aria-hidden="true"></i>&nbsp;`+
            value.name + "<br>" +
            "<span style=color:white;background-color:" + dayscolor + ">&nbsp;&nbsp;&nbsp;" +
            value.days + "d&nbsp;&nbsp;&nbsp;</span> <span style=font-size:smaller>&#119046;"+
            avail(totalReps[value.name],"")+"</span></td>";
    }

    // Free Play

    // Iterate over all keys in freeplayData
    const freeplayArray = Object.values(freeplayData);
    freeplayArray.sort((a,b) => a.name.localeCompare(b.name));
    rows["freeplay"] += "<tr style=font-size:small><th id='SKILL_FREEPLAY' style=background-color:darkgray;color:white;text-align:left>Free Play:</th>";


    for (let k = 0; k < freeplayArray.length; k++) {
        if (freeplayArray[k].name.startsWith("TEST")) {
            continue;
        }

        // handle case where number of freeplay items overflows the skillmap table which is 12 data columns
        if (k > 0 && (k % 12) === 0) {
          rows["freeplay"] += "</tr><tr>";

          if (!isAvail(needRowSpan["SKILL_FREEPLAY"])) {
            needRowSpan["SKILL_FREEPLAY"] = 1;
          }
          needRowSpan["SKILL_FREEPLAY"]++;
        }

        const value = freeplayArray[k];
        const precat = presetCategory(value.preset);
        const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(value.name)], "begin");

        let evals = evaluateSessionStats(0, 0, 0, 0, 0, 0, 0, value.days, schedule, false);

        let color = "gray";
        let dayscolor = evals.ageColor;

        rows["freeplay"] += "<td onclick=\"gotoPreset('"+
            value.name+ "',document.getElementById('skillMapContainer'),null)\" style=text-align:center;font-size:x-small;background-color:" +
            color + ";color:white;width:6.8vw title='Free play. Age: "+value.days+
            " day"+(value.days===1?"":"s")+". Description: "+value.description+"'>" +
            `<i id=learningScheduleIcon class="${learningScheduleIconName[schedule]}" style=font-size:10px aria-hidden="true"></i>&nbsp;`+
            value.name + "<br>" +
            "<span style=color:white;background-color:" + dayscolor + ">&nbsp;&nbsp;&nbsp;" +
            value.days + "d&nbsp;&nbsp;&nbsp;</span></td>";
    }

    sctab.innerHTML =  `<tbody>
      <tr id=skillmap_scales style=background-color:lightblue onclick='toggleSkillMapSection("scales")'>
        <th id="SMHEADER_scales" colspan=13 style=text-align:center;padding-top:5px;padding-bottom:5px>
          <div style=display:flex;justify-content:center;align-items:center;width:100%>
            <div id=skillmap_scales_collapse_icon
              style=float:left;margin-right:auto;color:gray><i class="fa-solid fa-minimize"></i>
            </div>
            <span style=flex:1;text-align:center><i class=\"fa-solid fa-stairs\"></i> SCALES</span>
          </div>
        </th>
      </tr>` +
      rows["header"] + "</tr>" +
      (count["maj"]?rows["maj"]:"<tr>") + "</tr>" +
      (count["natMin"]?rows["natMin"]:"<tr>") + "</tr>" +
      (count["chroma"]?rows["chroma"]:"<tr>") + "</tr>" +
      (count["minBlues"]?rows["minBlues"]:"<tr>") + "</tr>" +
      `<tr id=skillmap_arps style=background-color:lightblue onclick='toggleSkillMapSection("arps")'>
        <th id=SMHEADER_arps colspan=13 style=text-align:center;padding-top:5px;padding-bottom:5px>
          <div style=display:flex;justify-content:center;align-items:center;width:100%>
            <div id=skillmap_arps_collapse_icon onclick='toggleSkillMapSection("arps")'
              style=float:left;margin-right:auto;color:gray><i class="fa-solid fa-minimize"></i>
            </div>
            <span style=flex:1;text-align:center><i class=\"fa-solid fa-wave-square\"></i> ARPEGGIOS</span>
          </div>
        </th>
      </tr>` +
      rows["header"] + "</tr>" +
      rows["majArp"] + "</tr>" +
      rows["natMinArp"] + "</tr>" +
      `<tr id=skillmap_drills style=background-color:lightblue onclick='toggleSkillMapSection("drills")'>
         <th id=SMHEADER_drills colspan=13 style=text-align:center;padding-top:5px;padding-bottom:5px>
           <div style=display:flex;justify-content:center;align-items:center;width:100%>
             <div id=skillmap_drills_collapse_icon
               style=float:left;margin-right:auto;color:gray><i class="fa-solid fa-minimize"></i>
             </div>
             <span style=flex:1;text-align:center>
               <i class=\"fa-solid fa-screwdriver-wrench\"></i> OTHER DRILLS</span>
           </div>
         </th>
       </tr>` +
      rows["drill"] + "</tr>"+
      `<tr id=skillmap_freeplay style=background-color:lightblue onclick='toggleSkillMapSection("freeplay")'>
         <th id=SMHEADER_freeplay colspan=13 style=text-align:center;padding-top:5px;padding-bottom:5px>
           <div style=display:flex;justify-content:center;align-items:center;width:100%>
             <div id=skillmap_freeplay_collapse_icon
               style=float:left;margin-right:auto;color:gray><i class="fa-solid fa-minimize"></i>
             </div>
             <span style=flex:1;text-align:center>
               <i class=\"fa-solid fa-music\"></i> FREE PLAY</span>
           </div>
         </th>
       </tr>` +
      rows["freeplay"] + "</tr>"+
        `<tr id=skillmap_repertoire style=background-color:lightblue onclick='toggleSkillMapSection("repertoire")'>
         <th id=SMHEADER_repertoire colspan=13 style=text-align:center;padding-top:5px;padding-bottom:5px>
           <div style=display:flex;justify-content:center;align-items:center;width:100%>
             <div id=skillmap_repertoire_collapse_icon
               style=float:left;margin-right:auto;color:gray><i class="fa-solid fa-minimize"></i>
             </div>
             <span style=flex:1;text-align:center>
               <i class=\"fa-solid fa-book-open\"></i> REPERTOIRE
           </div>
         </th>
       </tr>` +
     rows["repertoire"] + "</tr>"+

     "</tbody>";

    if (latestPracticeDate < todayDate()) {
      // if it's been a whole day since the last practice, open up all
      // skillmap sections.
      openAllSkillMapSections();
    }

    setTimeout(function() {
      skillMapDisplaySection("scales");
      skillMapDisplaySection("arps");
      skillMapDisplaySection("drills");
      skillMapDisplaySection("freeplay");
      skillMapDisplaySection("repertoire");
    }, 0);

    setTimeout(function() {
      for (const key in needRowSpan) {
        if (needRowSpan.hasOwnProperty(key)) {
          document.getElementById(key).setAttribute("rowspan", String(needRowSpan[key]));
        }
      }

      hideEmptyRows("skillMapTable");
    },200);
}

function hideEmptyRows(table) {
    var table = document.getElementById(table);
    if (table) {
        var rows = table.getElementsByTagName('tr');
        for (var i = 0; i < rows.length; i++) {
            var ths = rows[i].getElementsByTagName('th');
            var tds = rows[i].getElementsByTagName('td');

            // Check if the row has only one TH and no TDs
            if (ths.length === 1 && tds.length === 0) {
                // Check if the TH does not have a colspan or colspan less than 2
                if (!ths[0].hasAttribute('colspan') || ths[0].getAttribute('colspan') < 2) {
                    rows[i].style.display = 'none';
                }
            }
        }
    }
}

function openAllSkillMapSections() {
  const sections = ["scales", "arps", "drills", "freeplay", "repertoire"];

  for (let i = 0; i < sections.length; i++) {
    skillMapSectionCollapsed[sections[i]] = false;
    localStorage.setItem("skillMapSectionCollapsed_"+sections[i], "false");
  }
}

function toggleSkillMapSection(section) {
  skillMapSectionCollapsed[section] = !avail(skillMapSectionCollapsed[section], false);
  localStorage.setItem("skillMapSectionCollapsed_"+section, String(skillMapSectionCollapsed[section]));
  console.log("Set skillmapsection "+section+" to "+skillMapSectionCollapsed[section]);
  skillMapDisplaySection(section);
}

function skillMapDisplaySection(section) {
  skillMapSectionCollapsed[section] = (localStorage.getItem("skillMapSectionCollapsed_"+section) === "true")?true:false;
  const status = avail(skillMapSectionCollapsed[section],false)?"none":"table-row";
  const icon = avail(skillMapSectionCollapsed[section],false)?"maximize":"minimize";
  const padding = avail(skillMapSectionCollapsed[section],false)?"0px":"5px";
  const bgcolor = avail(skillMapSectionCollapsed[section],false)?"lightgray":"lightblue";

  // Find the starting section by ID
  const startSection = document.getElementById(`skillmap_${section}`);
  const collapseIcon = document.getElementById(`skillmap_${section}_collapse_icon`);
  const header = document.getElementById(`SMHEADER_${section}`);
  header.style.paddingTop = padding;
  header.style.paddingBottom = padding;
  header.style.backgroundColor = bgcolor;
  collapseIcon.innerHTML = "<i class=\"fa-solid fa-"+icon+"\"></i>";

  if (!startSection) {
    console.error("Section not found:", section);
    return;
  }

  let isHiding = false; // Flag to start hiding rows
  // Get all rows in the table to ensure we only iterate over relevant elements
  const rows = document.querySelectorAll('table tr');

  rows.forEach(row => {
    // Check if this row is a section header
    if (row.id && row.id.startsWith('skillmap_')) {
      // If we've reached the next section, stop hiding rows
      if (isHiding) {
        isHiding = false;
        return;
      }
      // If this is our start section, start hiding the following rows
      if (row === startSection) {
        isHiding = true;
        return;
      }
    }

    // Hide this row if we are in hiding mode
    if (isHiding) {
      row.style.display = status;
    }
  });
}
