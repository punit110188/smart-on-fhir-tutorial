(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          // if (typeof patient.name[0] !== 'undefined') {
          //   fname = patient.name[0].given.join(' ');
          //   lname = patient.name[0].family.join(' ');
          // }

          if (typeof patient.name[0] !== 'undefined') {
              // If 'given' is an array, join the names with a space; otherwise, use it directly
              fname = Array.isArray(patient.name[0].given) ? patient.name[0].given.join(' ') : patient.name[0].given;

            // If 'family' is an array, join it with a space; otherwise, use the string directly
            lname = Array.isArray(patient.name[0].family) ? patient.name[0].family.join(' ') : patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
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

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
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
    fetchAndRenderClinicalTrials();
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
