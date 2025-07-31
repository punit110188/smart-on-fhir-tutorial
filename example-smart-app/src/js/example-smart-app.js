(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

 function onReady(smart) {
  if (smart.hasOwnProperty('patient')) {
    smart.patient.read().then(function(pt) {
      const fname = Array.isArray(pt.name?.[0]?.given) ? pt.name[0].given.join(" ") : pt.name?.[0]?.given || '';
      const lname = Array.isArray(pt.name?.[0]?.family) ? pt.name[0].family.join(" ") : pt.name?.[0]?.family || '';
      const info = {
        PatientName: `${fname} ${lname}`.trim(),
        gender: pt.gender || '',
        birthdate: pt.birthDate || ''
      };

      // Fetch trials next
      fetch("https://clinicaltrials.gov/api/v2/studies?query.titles=cancer&pageSize=10")
        .then(res => res.json())
        .then(data => {
          const trials = data.studies.map(extractTrialDetails);

          const payload = {
            patient: info,
            trials: trials
          };

          const json = JSON.stringify(payload);

          function safeBtoa(str) {
            return btoa(unescape(encodeURIComponent(str)));
          }

          const encoded = encodeURIComponent(safeBtoa(json));

          const vbAppUrl = `http://127.0.0.1:58320/L1VzZXJzL3B1bmlzcml2L0Rvd25sb2Fkcy9wZGRfdGVzdC0xLjA/design/pdd_test/1750998212126/preview/webApps/providerdirectory/?data=${encoded}`;
          console.log("Redirecting to:", vbAppUrl);
          window.location.href = vbAppUrl;
        })
        .catch(err => {
          console.error("Failed to fetch trials", err);
        });

    }).fail(onError);
  }
}



    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();
  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    fetchTrialsV2();
  };

  function fetchTrialsV2() {
    fetch("https://clinicaltrials.gov/api/v2/studies?query.titles=cancer&pageSize=50")
      .then(res => res.json())
      .then(data => renderTrialsV2(data.studies))
      .catch(err => console.error("Failed to fetch trial data", err));
  }

  function renderTrialsV2(studies) {
    const container = document.getElementById("trials-list");
    container.innerHTML = "";

    studies.slice(0, 10).forEach((study, i) => {
      const trial = extractTrialDetails(study);

      const html = `
        <div style="margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #ccc;">
          <strong>${i + 1}. ${trial.title}</strong><br/>
          <em>${trial.sponsor}</em><br/>
          Status: ${trial.status || "N/A"}<br/>
          Start Date: ${trial.startDate || "N/A"}<br/>
          <p>${trial.summary}</p>
          <a href="${trial.url}" target="_blank">View Full Trial</a>
        </div>
      `;
      container.innerHTML += html;
    });

    document.getElementById("trials").style.display = "block";
  }

  function extractTrialDetails(study) {
    const idModule = study.protocolSection.identificationModule;
    const statusModule = study.protocolSection.statusModule;
    const descModule = study.protocolSection.descriptionModule;
    const sponsorModule = study.protocolSection.sponsorCollaboratorsModule;

    return {
      nctId: idModule?.nctId,
      title: idModule?.briefTitle,
      sponsor: sponsorModule?.leadSponsor?.name,
      status: statusModule?.overallStatus,
      startDate: statusModule?.startDateStruct?.date,
      summary: descModule?.briefSummary,
      url: `https://clinicaltrials.gov/study/${idModule?.nctId}`
    };
  }

})(window);
