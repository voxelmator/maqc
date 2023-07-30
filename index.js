//(C) Philippe PUECH, 2022..2023,
//2023 02 18

const thumbsize=165;

const CONST_IN_PHASE=0;
const CONST_IN_FREQUENCY=1;

const CONST_BVALUE=0;
const CONST_DWISIGNATURE=1;

const CONST_IMAGEPOSITION=0;
const CONST_FILEENTRY=1;

const CONST_TPIINDEX=0;
const CONST_TPITIME=1;
const CONST_TPISIGNATURE=2;
const CONST_TPICONTENTTIME=3;

const CONST_SG_BGCOLOR=0;
const CONST_SG_SIGNATURE=1;
const CONST_SG_LABEL=2;
const CONST_SG_UID=3;
const CONST_SG_SUBSERIES=4;

const CONST_SUBSERIESUID=0;
const CONST_SUBSERIESDESCRIPTION=1;
const CONST_SUBSERIESNUMBER=2;

var studies=[];
var ajax_sent=[];
var monintervalle=-1;
var monintervalle_processfile=-1;
var files_processed=0;
var files_multiframe=0;
var dumpz=[];
var fonctions_get_tags_en_attente=0;
var error_list=[];
var progress_text='';
var files_ignored=0;
var start_analysis=undefined;
var global_cancel_alert=false;

function time_to_ms(t){
  return Date.parse("July 21, 1983 "+t+":000");
}
function array_of_ms(tab){
  var nt=[];
  for (var t=0;t<tab.length-1;t++){
    nt[t]=time_to_ms(tab[t]);
  }
  return nt;
}
function array_of_ms_full(tab){
  var nt=[];
  for (var t=0;t<tab.length;t++){
    nt[t]=time_to_ms(tab[t]);
  }
  return nt;
}
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}
function msTohms(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  //return hrs + ':' + mins + ':' + secs + '.' + ms;
  return pad(hrs,2) + ':' + pad(mins,2) + ':' + pad(secs,2);
}
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
function getRandomIntRoundedTen(max) {
  return Math.round(getRandomInt(max) / 10) * 10
}
function get_subarray(sourcearray,propriete){
  var ret=new Array();
  for (var a=0;a<sourcearray.length;a++){
    ret.push(sourcearray[a][propriete]);
  }
  return ret;
}
function uniqueArray2(arr) {
    var a = [];
    for (var i=0, l=arr.length; i<l; i++)
        if (a.indexOf(arr[i]) === -1 && arr[i] !== '')
            a.push(arr[i]);
    return a;
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//######################################################################
//Tags et data DICOM (lecture, décodage, transcription, image, cornerstone)
//######################################################################
  function get_model_service_year(manufacturer,model,softwareversion){
  var yos="Unknown";
  if (softwareversion==undefined){
    softwareversion="unknown";
  }
  softwareversion=softwareversion.toLowerCase();
  var softwareversion_elements=softwareversion.split("|");
  softwareversion=softwareversion_elements[0];
  manufacturer=manufacturer.toLowerCase();
  switch (manufacturer){
    case "siemens healthineers":manufacturer="siemens";break;
    case "philips healthcare":manufacturer="philips";break;
    case "philips medical systems":manufacturer="philips";break;
  }
  model=model.toLowerCase();
  switch (manufacturer){
    case "toshiba":
      //https://global.medical.canon/service-support/Interoperability/DICOM_PastProducts
      var models=["orian|>2018","fortian|>2022","titan|>2015","elan|>2014"];
      for (var m=0;m<models.length;m++){
        var chunks=models[m].split("|");
        if (model.indexOf(chunks[0])>=0){
          yos=chunks[1];
          break;
        }
      }
      break;
    case "canon_mec":
      //https://www.gehealthcare.com/products/interoperability/dicom/magnetic-resonance-imaging-dicom-conformance-statements
      var models=["orian|>2018","galan 3t|>2019","centurian|>2020","elan|>2021","fortian|>2022"];
      for (var m=0;m<models.length;m++){
        var chunks=models[m].split("|");
        if (model.indexOf(chunks[0])>=0){
          yos=chunks[1];
          break;
        }
      }
      break;
    case "ge medical systems":
      //https://www.gehealthcare.com/products/interoperability/dicom/magnetic-resonance-imaging-dicom-conformance-statements
      var models=["mr450|>2011","explorer|>2014","creator|>2014","pioneer|>2015","voyager|>2016","architect|>2016","artist|>2017","premier|>2018","prime|>2021","hero|>2021"];
      for (var m=0;m<models.length;m++){
        var chunks=models[m].split("|");
        if (model.indexOf(chunks[0])>=0){
          yos=chunks[1];
          break;
        }
      }
      break;
    case "philips":
      //https://www.usa.philips.com/healthcare/resources/support-documentation/dicom-magnetic-resonance-imaging
      switch (softwareversion){
          case "11.1":yos="March, 2022";break;
          case "11.0":yos="November, 2021";break;
          case "11.0.0":yos="November, 2021";break;
          case "5.9.0":yos="June, 2021";break;
          case "5.8":yos="March, 2022";break;
          case "5.8.0":yos="March, 2021";break;
          case "5.7.1":yos=">2018";break;
          case "5.7.0":yos=">2018";break;
          case "5.6.1":yos=">2020";break;
          case "5.6.0":yos="July, 2018";break;
          case "5.4.1":yos="[2017-July 2018]";break;
          case "5.1.12":yos="July, 2015";break;
          case "5.1.7":yos="April, 2015";break;
          case "5.1.9":yos="April, 2015";break;
      }
      if (yos==''){
          var models=["mr450|>2011","explorer|>2014","creator|>2014","pioneer|>2015","voyager|>2016","architect|>2016","artist|>2017","premier|>2018","prime|>2021","hero|>2021"];
          for (var m=0;m<models.length;m++){
            var chunks=models[m].split("|");
            if (model.indexOf(chunks[0])>=0){
              yos=chunks[1];
              break;
            }
          }
      }


      break;
    case "siemens":
      switch (softwareversion){
          //https://www.siemens-healthineers.com/services/it-standards/dicom-conformance-statements-magnetic-resonance/1-5t-systems
          case "syngo mr a35":yos="<=2012";break;//pas sûr
          case "syngo mr a40":yos="April, 2013";break;  
          case "syngo mr b19":yos="March, 2013";break;
          case "syngo mr b19b":yos="February, 2017";break;
          case "syngo mr b20p":yos="May, 2013";break;
          case "syngo mr c11":yos="<=2012";break;//pas sûr
          case "syngo mr c13":yos="<=2012";break;//pas sûr
          case "syngo mr c15":yos="<=2012";break;//pas sûr
          case "syngo mr e11s":yos="February, 2017";break;
          case "syngo mr e11a":yos="January, 2016";break;
          case "syngo mr e11p":yos="March, 2017";break;
          case "syngo mr e11n":yos="January, 2016";break;
          case "syngo mr e11m":yos="June, 2016";break;
          case "syngo mr e11e":yos="November, 2020";break;
          case "syngo mr e11d":yos="January, 2019";break;
          case "syngo mr e11c (ap01)":yos="February, 2017";break;
          case "syngo mr e11c":yos="February, 2017";break;
          case "syngo mr e11b":yos="October, 2015";break;
          case "syngo mr e11":
            switch(model){
              case "avanto_fit":yos="November, 2020";// il y a un bug sur l'avanto fit de Nov 2020 qui ne prend pas le e11e
                break;
              default:
                yos="December, 2014";
                break;
            }
            break;
          case "syngo mr e11k":yos="October, 2017";break;//7T only
          case "syngo mr e12u":yos="December, 2018";break;//7T only
          case "syngo mr d14":yos="December, 2012";break;
          case "syngo mr d13e":yos="December, 2013";break;
          case "syngo mr d13d":yos="December, 2013";break;
          case "syngo mr d13b":yos="December, 2013";break;
          case "syngo mr d13":yos="December, 2013";break;
          case "syngo mr d12":yos="February, 2012";break;
          case "syngo mr xa10b":yos="July, 2020";break;//china only
          case "syngo mr xa10a":yos="July, 2017";break;
          case "syngo mr xa11b":yos="March, 2019";break;
          case "syngo mr xa11a":yos="December, 2018";break;
          case "syngo mr xa12":yos="May, 2019";break;
          case "syngo mr xa12m":yos="May, 2019";break;
          case "syngo mr xa12s":yos="November, 2022";break;
          case "syngo mr xa20":yos="April, 2019";break;
          case "syngo mr xa20\magnetom vida syngo mr xa20":yos="April, 2019";break;
          case "syngo mr xa20a":yos="April, 2019";break;
          case "syngo mr xa30":yos="May, 2020";break;
          case "syngo mr xa30a":yos="May, 2020";break;
          case "syngo mr xa31":yos="May, 2022";break;
          case "syngo mr xa31a":yos="May, 2022";break;
          case "syngo mr xa40a":yos="February, 2021";break;//<1
          case "syngo mr xa50a":yos="November, 2021";break;
          case "syngo mr xa51a":yos="May, 2022";break;
      }
      break;
    case "philips":
      break;
    case "ge medical systems":
      break;
    case "canon_mec":
      break;
    default:
      break;
  }
  return yos;
}
    function get_FL_tag(dataSet,propertyName){
        //view-source:https://rawgit.com/cornerstonejs/dicomParser/master/examples/dumpWithDataDictionary/index.html
        var text='';
        text += dataSet.float(propertyName);
        if (dataSet.elements[propertyName]!=undefined){
         
                  for(var i=1; i < dataSet.elements[propertyName].length/8; i++) {
                      text += '\\' + dataSet.float(propertyName, i);
                  }
        }
      return text;
    }
    function get_FD_tag(dataSet,propertyName){
        //view-source:https://rawgit.com/cornerstonejs/dicomParser/master/examples/dumpWithDataDictionary/index.html
        var text='';
        text += dataSet.double(propertyName);
        if (dataSet.elements[propertyName]!=undefined){
                  for(var i=1; i < dataSet.elements[propertyName].length/8; i++) {
                      text += '\\' + dataSet.double(propertyName, i);
                  }
        }
      return text;
    }
    function get_US_tag(dataSet,propertyName){
        //view-source:https://rawgit.com/cornerstonejs/dicomParser/master/examples/dumpWithDataDictionary/index.html
        var text='';
        text += dataSet.uint16(propertyName);
        if (dataSet.elements[propertyName]!=undefined){
                  for(var i=1; i < dataSet.elements[propertyName].length/2; i++) {
                      text += '\\' + dataSet.uint16(propertyName, i);
                  }
        }
      return text;
    }
    function getTag(tag) {
        var group = tag.substring(1,5);
        var element = tag.substring(5,9);
        var tagIndex = ("("+group+","+element+")").toUpperCase();
        var attr = TAG_DICT[tagIndex];
        return attr;
    }    
    function get_tags(file){
        //view-source:https://rawgit.com/cornerstonejs/dicomParser/master/examples/dumpWithDataDictionary/index.html
        fonctions_get_tags_en_attente++;
        var tagsbag=new Object();
        var reader = new FileReader();
        reader.fileName=file.name;
        reader.onload = function(file) {
            var arrayBuffer = reader.result;
            // Here we have the file data as an ArrayBuffer.  dicomParser requires as input a
            // Uint8Array so we create that here
            var byteArray = new Uint8Array(arrayBuffer);
            var kb = byteArray.length / 1024;
            var mb = kb / 1024;
            var byteStr = mb > 1 ? mb.toFixed(3) + " MB" : kb.toFixed(0) + " KB";
            var nom_fichier=file.target.fileName;
            var extension = nom_fichier.split('.').pop();
            var ignored_extensions=["jpg","htm","gif","png","xml"];
            if (contains(ignored_extensions,extension.toLowerCase())){
              fonctions_get_tags_en_attente--;
            } else {
              setTimeout(function() {
                  // Invoke the paresDicom function and get back a DataSet object with the contents
                  var dataSet;
                  try {

                      dataSet = dicomParser.parseDicom(byteArray);
                      tagsbag.index = -1;//on ne peut pas le dire ici
                      tagsbag.sopclassuid = dataSet.string('x00080016');

                      tagsbag.stuid = dataSet.string('x0020000d');
                      tagsbag.stde = dataSet.string('x00081030');
                      tagsbag.stda = dataSet.string('x00080020');
                      tagsbag.institution = dataSet.string('x00080080');
                      //tagsbag.patient = dataSet.string('x00100010');
                      tagsbag.manufacturer = dataSet.string('x00080070');
                      tagsbag.model = dataSet.string('x00081090');
                      if (tagsbag.model==undefined){
                        var erreur=[];
                        erreur.exception="Image unsuitable";
                        throw erreur;
                      }
                      tagsbag.softwareversion = dataSet.string('x00181020');
                      if (tagsbag.softwareversion==undefined){
                        tagsbag.softwareversion='not found';
                      } else {
                        tagsbag.softwareversion=tagsbag.softwareversion.replace("/","|");
                        tagsbag.softwareversion=tagsbag.softwareversion.replace("\\","|");
                      }
                      tagsbag.fieldstrength = dataSet.string('x00180087');
                      tagsbag.bodypart = dataSet.string('x00180015');
                      if (tagsbag.bodypart==undefined){
                        tagsbag.bodypart='';
                      }


                      tagsbag.protocolname = dataSet.string('x00181030');
                      if (tagsbag.protocolname==undefined){
                        tagsbag.protocolname='';
                      }                  
                      tagsbag.seuid = dataSet.string('x0020000e');
                      tagsbag.number = dataSet.string('x00200011');
                      tagsbag.sede = dataSet.string('x0008103e');

                      if (tagsbag.manufacturer.toLowerCase().indexOf("canon_mec")!=-1){
                        //canon met les heures de série dans acquisition time
                        tagsbag.setm = dataSet.string('x00080032');//series time =31 ; acq time=32 ; content time=33
                        tagsbag.contenttm = dataSet.string('x00080033');//series time =31 ; acq time=32 ; content time=33
                        tagsbag.instancetm = dataSet.string('x00080013');//series time =31 ; acq time=32 ; content time=33 ; instance creation time =13 (siemens amira)
                        tagsbag.triggertime = dataSet.string('x00181060');
                      } else {
                        //pour siemens, philips et ge l'image est plutôt dans content time
                        tagsbag.setm = dataSet.string('x00080032');//series time =31 ; acq time=32 ; content time=33
                        tagsbag.contenttm = dataSet.string('x00080033');
                        tagsbag.instancetm = dataSet.string('x00080013');//series time =31 ; acq time=32 ; content time=33 ; instance creation time =13 (siemens amira)
                        tagsbag.triggertime = dataSet.string('x00181060');
                      }

                      if (tagsbag.setm==undefined){
                        tagsbag.setm = tagsbag.contenttm;//series time =31 ; acq time=32 ; content time=33
                        tagsbag.contenttm = tagsbag.contenttm;
                      }
                      if ((tagsbag.contenttm==tagsbag.setm)&&(tagsbag.instancetm!=undefined)){
                        //alert("meme temps");
                        tagsbag.contenttm = tagsbag.instancetm;
                      }

                      if (tagsbag.setm!=undefined){
                        var sttmo=tagsbag.setm.split(".");
                        tagsbag.setm=sttmo[0][0]+sttmo[0][1]+':'+sttmo[0][2]+sttmo[0][3]+':'+sttmo[0][4]+sttmo[0][5];
                      }
                      if (tagsbag.contenttm!=undefined){
                        var sttmo=tagsbag.contenttm.split(".");
                        tagsbag.contenttm=sttmo[0][0]+sttmo[0][1]+':'+sttmo[0][2]+sttmo[0][3]+':'+sttmo[0][4]+sttmo[0][5];
                      }
                      if (tagsbag.manufacturer.toLowerCase().indexOf("ge medical")!=-1){
                        if ((tagsbag.triggertime=='')||(tagsbag.triggertime==undefined)){
                          tagsbag.triggertime=0;
                        }
                        tagsbag.contenttm=msTohms(tagsbag.triggertime);
                      } else if (tagsbag.manufacturer.toLowerCase().indexOf("toshiba")!=-1) {
                        tagsbag.contenttm=msTohms(dataSet.string('x00200100'));
                      }
                      //http://dicomlookup.com/lookup.asp?sw=Ttable&q=C.8-4
                      tagsbag.sequencename = dataSet.string('x00180024');
                      if (tagsbag.sequencename!=undefined){
                        tagsbag.sequencename=tagsbag.sequencename.toLowerCase();
                      } else {
                        tagsbag.sequencename='';
                      }
                      tagsbag.scansequence = dataSet.string('x00180020');
                      tagsbag.scanvariant = dataSet.string('x00180021');
                      tagsbag.scanoptions = dataSet.string('x00180022');
                      tagsbag.imagetype = dataSet.string('x00080008');
                      if (tagsbag.imagetype==undefined){
                        var erreur=[];
                        erreur.exception="Image unsuitable";
                        throw erreur;
                      }
                      tagsbag.pulsesequencename = dataSet.string('x00189005');
                      if (tagsbag.pulsesequencename==undefined){
                        tagsbag.pulsesequencename='';
                      }
                      if (tagsbag.sequencename==''){
                        tagsbag.sequencename=tagsbag.pulsesequencename;
                      }
                      tagsbag.rows = get_US_tag(dataSet,'x00280010');
                      tagsbag.cols = get_US_tag(dataSet,'x00280011');                  
                      tagsbag.orientationtag = dataSet.string('x00200037');
                      var orientation = dataSet.string('x00200037');

                      if (orientation!=undefined){
                        var orz=orientation.split('\\');  
                        for (var o=0;o<orz.length;o++){
                          orz[o]=parseInt(Math.round((orz[o]),2));
                        }
                        tagsbag.orientation_original=orz;
                        if ((orz[0]==1)&&(orz[4]==1)){
                          orientation="AXIAL";
                        } else {
                          if ((orz[1]==1)&&(orz[5]==-1)){
                            orientation="SAGITTAL";
                          } else {
                            if ((orz[0]==1)&&(orz[5]==-1)){
                              orientation="CORONAL";
                            } else {
                              orientation=orz[0]+' \ '+orz[1]+' \ '+orz[2]+' \ '+orz[3]+' \ '+orz[4]+' \ '+orz[5];
                            }          
                          }          
                        }
                      } else {
                        orientation='n.a';
                      }
                      tagsbag.orientation=orientation;

                      tagsbag.tr = dataSet.string('x00180080');
                      if (tagsbag.tr!=undefined){
                        tagsbag.tr=Number(parseFloat(tagsbag.tr).toFixed(2));
                      }
                      tagsbag.te = dataSet.string('x00180081');
                      if (tagsbag.te!=undefined){
                        tagsbag.te=Number(parseFloat(tagsbag.te).toFixed(2));
                      }
                      tagsbag.flipangle = dataSet.string('x00181314');
                      //tagsbag.acquisitioncontrast = dataSet.string('x00089209');
                      tagsbag.percentphasefov=parseFloat(dataSet.string('x00180094')); //Ratio of field of view dimension in phase direction to field of view dimension in frequency direction, expressed as a percent.
                      tagsbag.percentsampling=parseFloat(dataSet.string('x00180093')); //Fraction of acquisition matrix lines acquired, expressed as a percent
                      tagsbag.phaseencodingdirection_ded=undefined;

                      debug("Rows="+tagsbag.rows);
                      debug("cols="+tagsbag.cols);
                      debug("PercentPhaseFOV="+tagsbag.percentphasefov);
                      debug("PercentSampling="+tagsbag.percentsampling);

                      var matrixtag;
                      matrixtag = (get_US_tag(dataSet,'x00181310'));//frequency rows\frequency columns\phase rows\phase column
                      if (matrixtag!="undefined"){
                          matrixtag=matrixtag.split("\\");
                          if (parseInt(matrixtag[2])!=0){//si phase rows n'est pas nul
                            tagsbag.phaseencodingdirection_ded="ROW";
                          }
                          if (parseInt(matrixtag[3])!=0){//si phase columns n'est pas nul
                            tagsbag.phaseencodingdirection_ded="COL";
                          }                            
                      }            

                      debug("Matrixtag");
                      debug(matrixtag);
                      var fov_phase ;
                      var fov_frequency ;
                      tagsbag.phaseencodingdirection = (dataSet.string('x00181312'));
                      if (tagsbag.phaseencodingdirection=='COLUMN'){
                        tagsbag.phaseencodingdirection='COL';
                      }
                      debug("PhaseEncDir="+tagsbag.phaseencodingdirection);
                      debug("PhaseEncDirDED="+tagsbag.phaseencodingdirection_ded);
                      if ((matrixtag[0]=='undefined')||(matrixtag=='undefined')){
                          //on est dans le cas où le fichier DICOM ne contient pas le champ 0018,1310
                          if (tagsbag.manufacturer.toLowerCase().indexOf("siemens")!=-1){

                            debug("EXCEPTION SIEMENS pour une séquence "+tagsbag.sequencename);
                            //attention, ça c'est pour la Vida, mais il est possible que Siemens place la matrice dans d'autres champs pour d'autres versions......
                            //
                            var inphasematrix=get_US_tag(dataSet,'x00189231');
                            var infreqmatrix=get_US_tag(dataSet,'x00189058');
                            if (tagsbag.sequencename.toLowerCase().indexOf("tsebr")!=-1){
                              //séquence BLADE. Le nombre de phase et de freq sont rows et cols
                              debug("exception number_of_phase_encoding_steps pour BLADE siemens");
                              if ((tagsbag.phaseencodingdirection=="ROW")||(tagsbag.phaseencodingdirection=="OTHER")){
                                 //le premier du pixelspacing est les rows
                                 inphasematrix=tagsbag.rows;
                                 infreqmatrix=tagsbag.cols;
                                 tagsbag.phaseencodingdirection_ded="ROW";
                              } else {
                                 inphasematrix=tagsbag.cols;
                                 infreqmatrix=tagsbag.rows;
                                 tagsbag.phaseencodingdirection_ded="COL";
                              }           
                            } else {
                            }
                            debug("InPhaseMatrix="+inphasematrix);
                            debug("infreqmatrix="+infreqmatrix);
                            if ((inphasematrix=="undefined")||(inphasematrix==undefined)){
                              //autre exception siemens vida (séquence GRASPdyn 3T vida boulogne)
                              //on récupère la matrice par percentsamplingphase rows et cols
                              if (tagsbag.percentsampling!=0){
                                  if ((tagsbag.phaseencodingdirection=="ROW")||(tagsbag.phaseencodingdirection=="OTHER")){
                                     //le premier du pixelspacing est les rows
                                     inphasematrix=tagsbag.rows*tagsbag.percentsampling/100;
                                     infreqmatrix=tagsbag.cols;
                                     tagsbag.phaseencodingdirection_ded="ROW";
                                  } else {
                                    if (tagsbag.phaseencodingdirection=="COL"){
                                      inphasematrix=tagsbag.cols*tagsbag.percentsampling/100;
                                      infreqmatrix=tagsbag.rows;
                                      tagsbag.phaseencodingdirection_ded="COL";
                                    }
                                  }                                
                              }

                              debug("PhaseEncDirDED2="+tagsbag.phaseencodingdirection_ded); 
                            }
                            //if (dataSet.string('x00189077')=='YES'){
                                //exception of PARALLEL acquisition. Phase means nothing
                                //debug("Parallel acquisition+++"); 
                            //}
                            var matrixtag2=[];
                            //frequency rows\frequency columns\phase rows\phase columns
                            switch (tagsbag.phaseencodingdirection){
                              case "OTHER":
                                matrixtag2[2]=parseInt(inphasematrix);//matrixtag2=phase rows
                                matrixtag2[1]=parseInt(infreqmatrix);//matrixtag1=frequency columns
                                break;
                              case "ROW":
                                matrixtag2[2]=parseInt(inphasematrix);//matrixtag2=phase rows
                                matrixtag2[1]=parseInt(infreqmatrix);//matrixtag1=frequency columns
                                break;
                              case "COL":
                                matrixtag2[3]=parseInt(inphasematrix);//matrixtag3=phase columns
                                matrixtag2[0]=parseInt(infreqmatrix);//matrixtag0=frequency rows
                                break;
                              case "COLUMN":
                                matrixtag2[3]=parseInt(inphasematrix);//matrixtag3=phase columns
                                matrixtag2[0]=parseInt(infreqmatrix);//matrixtag0=frequency rows
                                break;
                            }
                            matrixtag=matrixtag2;
                            debug("Matrixtag_ApresSiemens");
                            debug(matrixtag);
                          }
                      }

                      var devices_requiring_phase_correction=["signa premier","signa voyager"];
                      if (devices_requiring_phase_correction.indexOf(tagsbag.model.toLowerCase())!=-1){
                            //inversion COL/ROW
                            //inversion des données dans le champ MATRIX
                            //On utilise le champ percent phase FOV pour déterminer la largeur du FOV dans le sens de la phase (ex : 50%),;
                            debug("EXCEPTION D'INVERSION DE PHASE");

                            if (tagsbag.phaseencodingdirection!=undefined){
                                if (tagsbag.phaseencodingdirection=="COL"){
                                  tagsbag.phaseencodingdirection="ROW"
                                } else {
                                  tagsbag.phaseencodingdirection="COL";
                                }                        
                            }
                            if (tagsbag.phaseencodingdirection_ded=="ROW"){
                              tagsbag.phaseencodingdirection_ded="COL";
                            } else {
                              tagsbag.phaseencodingdirection_ded="ROW";
                            }
                            var matrixtag2=[];
                            matrixtag2[0]=parseInt(matrixtag[1]);
                            matrixtag2[1]=parseInt(matrixtag[0]);
                            matrixtag2[2]=parseInt(matrixtag[3]);
                            matrixtag2[3]=parseInt(matrixtag[2]);
                            matrixtag=matrixtag2;
                      }

                        tagsbag.pixelspacing = dataSet.string('x00280030');
                        //simple reformattage en tableau du pixelspacing
                        if (tagsbag.pixelspacing!=undefined){
                          if (tagsbag.pixelspacing.indexOf("\\")!=-1){
                            var ps=tagsbag.pixelspacing.split("\\");
                            ps[0]=Number(parseFloat(ps[0]).toFixed(2));
                            ps[1]=Number(parseFloat(ps[1]).toFixed(2));
                            tagsbag.pixelspacing=ps;
                          }
                        } else {
                          tagsbag.pixelspacing=[];
                        }

                    //tagsbag.phaseencodingdirection="COL";
                      var my_phase_encoding_direction=tagsbag.phaseencodingdirection;
                      if (((tagsbag.phaseencodingdirection==undefined)||(tagsbag.phaseencodingdirection=="OTHER"))&&(tagsbag.phaseencodingdirection_ded!=undefined)){
                        my_phase_encoding_direction=tagsbag.phaseencodingdirection_ded;
                      }

                      debug("NEW "+my_phase_encoding_direction);
                      var rfov=tagsbag.percentphasefov/100;
                      if (tagsbag.percentsampling==0){
                        rfov=1;//sur Hitachi, la séquence ADC contient les b0 dont le percentsampling et percentphasefov sont à 0....
                      }
                    
                       tagsbag.fov_frequency_tag = (dataSet.string('x00181100'));
                      //Be careful. The PixelSpacing and the Rows/Columns relate to the reconstructed image, rather than to the acquisition. During reconstruction it's not uncommon to pad the k-space (which modifies the spacing), and the image space (which modifies the size).
                      //In other words, the acquisition FOV cannot always be reliably calculated from PixelSpacing and Rows/Columns. The calculation will work for some MR reconstructions, but not for all.
                      //A more reliable (but still not perfect) way to get the field of view is "Reconstruction Diameter (0018,1100)," which is often used to store the FOV in the frequency-encode direction. Multiply this by "PercentPhaseFieldOfView (0018,0094)" (and divide by 100) to get the FOV in the phase-encode direction.
                      //Use the "InPlanePhaseEncodingDirection (0018,1312)" to figure out whether phase encoding is in the COL or ROW direction. The "AcquisitionMatrix (0018,1310)", if present, is a reliable way to get the rows/columns for the acquisition.

                      if (tagsbag.fov_frequency_tag==undefined){
                        //méthode 1
                          if ((my_phase_encoding_direction=="ROW")||(my_phase_encoding_direction=="OTHER")){
                             //le premier du pixelspacing est les rows
                             fov_phase = tagsbag.pixelspacing[0]*tagsbag.rows*rfov;
                             fov_frequency = tagsbag.pixelspacing[1]*tagsbag.cols;
                          } else {
                            if (my_phase_encoding_direction=="COL"){
                             fov_phase = tagsbag.pixelspacing[1]*tagsbag.rows*rfov;
                             fov_frequency = tagsbag.pixelspacing[0]*tagsbag.cols;
                            }
                          }
                      } else {
                        //
                          fov_frequency=parseInt(tagsbag.fov_frequency_tag);
                          fov_phase=parseInt(fov_frequency*rfov);
                      }
                      tagsbag.fov=[];
                      tagsbag.fov[CONST_IN_PHASE]=Number(parseFloat(fov_phase).toFixed(2));
                      tagsbag.fov[CONST_IN_FREQUENCY]=Number(parseFloat(fov_frequency).toFixed(2));
                      //percent sampling is the fraction of acquisition matrix lines acquired.
                      var percent_sampling = tagsbag.percentsampling / 100;
                      percent_sampling=1;//chez Philips Ingenia le calcul de la matrice ne doit pas intégrer le percent sampling (le champ matrix est d'emblée ok)

                       if (devices_requiring_phase_correction.indexOf(tagsbag.model.toLowerCase())!=-1){
                         rfov=1;
                       }

                      var acquisition_matrix_frequency;
                      var acquisition_matrix_phase;
                      //frequency rows\frequency columns\phase rows\phase columns
                      var number_of_phase_encoding_steps=(dataSet.string('x00180089'));
                      if (number_of_phase_encoding_steps!=undefined){
                        number_of_phase_encoding_steps=parseInt(number_of_phase_encoding_steps);
                        if (tagsbag.manufacturer.toLowerCase().indexOf("siemens")!=-1){
                          //chez Siemens, le number_of_phase_encoding_steps est égal au facteur TURBO dans les séquences BLADE (qu'on ne peut pas détecter autrement que par sequence name ; e.g BLADE de sola seclin)
                          if (tagsbag.sequencename.toLowerCase().indexOf("tsebr")!=-1){
                            //séquence BLADE. Le nombre de phase et de freq sont rows et cols
                            debug("exception number_of_phase_encoding_steps pour BLADE siemens");
                            if ((my_phase_encoding_direction=="ROW")||(my_phase_encoding_direction=="OTHER")){
                                number_of_phase_encoding_steps=tagsbag.rows;
                            } else {
                                number_of_phase_encoding_steps=tagsbag.cols;
                            }
                          }
                        }
                      } else {

                      }
                      debug("PED="+my_phase_encoding_direction);
                      debug(matrixtag);
                      debug("NPES="+number_of_phase_encoding_steps);
                      if ((my_phase_encoding_direction=="ROW")||(my_phase_encoding_direction=="OTHER")){
                         acquisition_matrix_frequency=parseInt(matrixtag[1]);
                          //préférer l'info qui est dans matrixtag
                          if (matrixtag[2]=="undefined"){
                            acquisition_matrix_phase=parseInt(parseFloat(number_of_phase_encoding_steps * rfov * percent_sampling));
                          } else {
                            acquisition_matrix_phase=parseInt(parseFloat(matrixtag[2] * rfov * percent_sampling));
                          }
                      } else  {
                        if (my_phase_encoding_direction=="COL"){
                            acquisition_matrix_frequency=parseInt(matrixtag[0]);
                            if (matrixtag[3]=="undefined"){
                              acquisition_matrix_phase=parseInt(parseFloat(number_of_phase_encoding_steps * rfov * percent_sampling));
                            } else {
                              acquisition_matrix_phase=parseInt(parseFloat(matrixtag[3] * rfov * percent_sampling));
                            }
                        }
                      }
                      tagsbag.matrix=[];
                      tagsbag.matrix[CONST_IN_PHASE]=acquisition_matrix_phase;
                      tagsbag.matrix[CONST_IN_FREQUENCY]=(acquisition_matrix_frequency);
                      var pixel_size_frequency = fov_frequency / acquisition_matrix_frequency;
                      var pixel_size_phase = fov_phase / acquisition_matrix_phase;
                      tagsbag.acquired_pixelsize=[];
                      tagsbag.acquired_pixelsize[CONST_IN_PHASE]=(parseFloat(pixel_size_phase).toFixed(2));
                      tagsbag.acquired_pixelsize[CONST_IN_FREQUENCY]=(parseFloat(pixel_size_frequency).toFixed(2));

                      tagsbag.slicethickness = dataSet.string('x00180050');
                      if (tagsbag.slicethickness!=undefined){
                          tagsbag.slicethickness=Number(parseFloat(tagsbag.slicethickness).toFixed(2));
                      }
                      tagsbag.spacebetweenslices = dataSet.string('x00180088');
                      if (tagsbag.spacebetweenslices==undefined){
                        tagsbag.spacebetweenslices=tagsbag.slicethickness;
                      }
                      if (tagsbag.spacebetweenslices!=undefined){
                          tagsbag.spacebetweenslices=Number(parseFloat(tagsbag.spacebetweenslices).toFixed(2));
                      }
                      tagsbag.acquisitionduration = (get_FD_tag(dataSet,'x00189073'));
                      if (tagsbag.acquisitionduration!="undefined"){
                        tagsbag.acquisitionduration=parseInt(tagsbag.acquisitionduration);
                      } else {
                        tagsbag.acquisitionduration=Math.round(get_FL_tag(dataSet,'x0019105a')/1000000);
                      }
                      tagsbag.contrast = dataSet.string('x00181040');
                      if (tagsbag.contrast==undefined){
                        tagsbag.contrast = dataSet.string('x00180010');
                      }                    
                      tagsbag.acquisitionnumber = dataSet.string('x00200012');
                      tagsbag.temporalposition = (dataSet.uint16('x00209128'));//canon met les ms dans le tpi, et le tpi(temporal position INDEX) en 20,9128...
                      if (tagsbag.temporalposition==undefined){
                        tagsbag.temporalposition = dataSet.string('x00200100');
                        if (tagsbag.temporalposition==undefined){
                          tagsbag.temporalposition = tagsbag.acquisitionnumber;//acquisition number (Siemens)
                        }
                      } else {
                        tagsbag.temporalposition = parseInt(tagsbag.temporalposition);
                      }
                      if (tagsbag.temporalposition!==undefined){//cette propriété surajoutée à la série peut être ajoutée dans sa signature. Ca évite que la série de repérage (qui n'a pas de TPI) soit incluse dans le groupe, mais ça permet aux séries contenant n sous séries avec n TPIs de rester groupées
                        tagsbag.temporalpositionidentifiernotnull="1";
                      } else {
                        tagsbag.temporalpositionidentifiernotnull="0";
                      }

                      //fabriquer une signature d'acquisition de séquence d'une série
                      var signaturebag=[]; //signaturebag.push(tagsbag.sequencename,tagsbag.scanvariant,tagsbag.scanoptions,tagsbag.imagetype,tagsbag.pulsesequencename,tagsbag.rows,tagsbag.cols,tagsbag.orientationtag,tagsbag.tr,tagsbag.te,tagsbag.flipangle,tagsbag.matrix[CONST_IN_PHASE],tagsbag.matrix[CONST_IN_FREQUENCY],tagsbag.temporalpositionidentifiernotnull,tagsbag.contrast); On DOIT ENLEVER tagsbag.orientationtag, car certains dynamiques ont, pour chaque image, un sinus ou cosinus d'orientation variant à la 8èmme décimale..... donc ça fait n groupes au lieu d'un seul.
                    signaturebag.push(tagsbag.sequencename,tagsbag.scanvariant,tagsbag.scanoptions,tagsbag.imagetype,tagsbag.pulsesequencename,tagsbag.rows,tagsbag.cols,tagsbag.tr,tagsbag.te,tagsbag.flipangle,tagsbag.matrix[CONST_IN_PHASE],tagsbag.matrix[CONST_IN_FREQUENCY],tagsbag.temporalpositionidentifiernotnull);
                      if ((tagsbag.manufacturer.toLowerCase().indexOf("hitachi")!=-1)){
                          //ne PAS mmettre le contraste dans la signature pour Hitachi, car les #1 des séquences dynamiques ne contiennent pas le champ "contrast media"...OMG....
                        } else {
                          signaturebag.push(tagsbag.contrast);
                        }
                      var signature=signaturebag.join(';');
                      tagsbag.filesignature=signature;

                      if ((tagsbag.manufacturer.toLowerCase().indexOf("hitachi")!=-1)&&(tagsbag.sequencename.toLowerCase().indexOf("dw")!=-1)){
                        var lasequencemr = dataSet.elements.x52009230.items[0].dataSet.elements.x00189117.items[0].dataSet;
                        tagsbag.bvalue = get_FD_tag(lasequencemr,'x00189087');
                      } else {
                        tagsbag.bvalue = get_FD_tag(dataSet,'x00189087');//ce champ est une exception. Non lu comme les autres de type FD
                      }
                      if (tagsbag.bvalue==undefined){
                        tagsbag.bvalue='';
                      }
                      tagsbag.imageposition = dataSet.string('x00200032');

                      var itxo=tagsbag.imagetype.toLowerCase().split("\\");
                      tagsbag.acquired_instead_of_reconstructed = ((contains_element_matching_rule(itxo,"*projection*")==false)&&
                                                                   (contains_element_matching_rule(itxo,"*mpr*")==false)&&
                                                                   (contains_element_matching_rule(itxo,"*reforma*")==false)&&
                                                                   (contains_element_matching_rule(itxo,"*secondar*")==false)&&
                                                                   (contains_element_matching_rule(itxo,"*sub*")==false)&&
                                                                   (contains_element_matching_rule(itxo,"*adc*")==false)&&
                                                                   (matrixtag!=undefined));
                      fonctions_get_tags_en_attente--;
                  }
                  catch(err)
                  {
                      fonctions_get_tags_en_attente--;
                      var message = err.stack;
                      if(err.exception) {
                          message = err.exception;
                      }
                      var ignored_files=["dicomdir",".ds_store","version","lockfile","readme.txt","content.xml"];
                      if (!contains(ignored_files,nom_fichier.toLowerCase())){
                        error_list.push('Error - ' + message + ' (file "'+nom_fichier+'" of size ' + byteStr + ' )');                      
                      }
                      update_status();
                  }
              },10);              
            }   
            // set a short timeout to do the parse so the DOM has time to update itself with the above message
        };
        reader.readAsArrayBuffer(file);
        return tagsbag;
    }
    function loadAndViewImage(element,imageId) {
        //const element = document.getElementById('dicomImage');
        const start = new Date().getTime();
        cornerstone.loadImage(imageId).then(function(image) {
            const viewport = cornerstone.getDefaultViewportForImage(element, image);
            //document.getElementById('toggleModalityLUT').checked = (viewport.modalityLUT !== undefined);
            //document.getElementById('toggleVOILUT').checked = (viewport.voiLUT !== undefined);
          
            cornerstone.displayImage(element, image, viewport);
            if(false) {//(loaded === false)
                cornerstoneTools.mouseInput.enable(element);
                cornerstoneTools.mouseWheelInput.enable(element);
                cornerstoneTools.wwwc.activate(element, 1); // ww/wc is the default tool for left mouse button
                cornerstoneTools.pan.activate(element, 2); // pan is the default tool for middle mouse button
                cornerstoneTools.zoom.activate(element, 4); // zoom is the default tool for right mouse button
                cornerstoneTools.zoomWheel.activate(element); // zoom is the default tool for middle mouse wheel
                cornerstoneTools.imageStats.enable(element);
                loaded = true;
            }

            function getTransferSyntax() {
                const value = image.data.string('x00020010');
                return value + ' [' + uids[value] + ']';
            }

            function getSopClass() {
                const value = image.data.string('x00080016');
                return value + ' [' + uids[value] + ']';
            }

            function getPixelRepresentation() {
                const value = image.data.uint16('x00280103');
                if(value === undefined) {
                    return;
                }
                return value + (value === 0 ? ' (unsigned)' : ' (signed)');
            }

            function getPlanarConfiguration() {
                const value = image.data.uint16('x00280006');
                if(value === undefined) {
                    return;
                }
                return value + (value === 0 ? ' (pixel)' : ' (plane)');
            }



        }, function(err) {
            error_list.push(err);
        });
    }

//######################################################################
//Tableau Study[].serie[], etc...
//######################################################################
    function find_st(stuid){
      var stidx=-1;
      for (var st=0;st<studies.length;st++){
        if (stuid==studies[st].uid){
          stidx=st;
        }
      }
      return stidx;
    }
    function find_se(stidx,seuid){
      var seidx=-1;
      for (var se=0;se<studies[stidx].series.length;se++){
        if (seuid==studies[stidx].series[se].uid){
          seidx=se;
        }
      }
      return seidx;
    }
    function get_study_seriesgroup_data_by_uid(stidx,uid){
        var studydata=studies[stidx];
        var groupdata;
        for (var sg=0;sg<studydata.series_groups.length;sg++){
          if (studydata.series_groups[sg][CONST_SG_UID]==uid){
            groupdata=studydata.series_groups[sg];
            break;
          }
        }
        return groupdata;
    }
    function add_sequencename_to_series(stidx,seidx,sqname){
      //retourne true si ajout
      var ret=false
        if (sqname!=undefined){
            if(studies[stidx].series[seidx].sequencenames.indexOf(sqname) == -1) {
                studies[stidx].series[seidx].sequencenames.push(sqname);
                ret=true;
            }
        }
        return ret;
    }
    function add_bvalue_to_series(stidx,seidx,bvalue){
      //retourne true si ajout
      var ret=false
      if ((bvalue!=undefined)&&(bvalue!='')&&(bvalue!='undefined')){
            bvalue=parseInt(bvalue);
            var found=-1;
            for (var t=0;t<studies[stidx].series[seidx].bvalues.length;t++){
              if (studies[stidx].series[seidx].bvalues[t][CONST_BVALUE]==bvalue){
                found=t;
                break;
              }
            }
            if (found==-1){
              ret=true;
              var adwi=new Array();
              adwi[CONST_BVALUE]=bvalue;
              adwi[CONST_DWISIGNATURE]=studies[stidx].series[seidx].scansequence+studies[stidx].series[seidx].scanvariant+studies[stidx].series[seidx].scanoptions+studies[stidx].series[seidx].orientationtag;
              studies[stidx].series[seidx].bvalues.push(adwi);
              studies[stidx].series[seidx].bvalues.sort(function (a, b) {
                var contentA =a[CONST_BVALUE];
                var contentB =b[CONST_BVALUE];
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
              });
            }
      }
    }
    function add_temporalposition_to_series(stidx,seidx,temporalposition,acquisitiontime,contenttime){
      //retourne true si ajout
      var ret=false
      if ((temporalposition!=undefined)&&(temporalposition!='')&&(temporalposition!='undefined')){
            temporalposition=parseInt(temporalposition);
            var found=-1;
            for (var t=0;t<studies[stidx].series[seidx].temporalpositions.length;t++){
              if (studies[stidx].series[seidx].temporalpositions[t][CONST_TPIINDEX]==temporalposition){
                found=t;
                break;
              }
            }
            if (found==-1){
              ret=true;
              var atpi=new Array();
              atpi[CONST_TPIINDEX]=temporalposition;
              atpi[CONST_TPITIME]=acquisitiontime;
              atpi[CONST_TPISIGNATURE]=studies[stidx].series[seidx].scansequence+studies[stidx].series[seidx].scanvariant+studies[stidx].series[seidx].scanoptions+studies[stidx].series[seidx].orientationtag;
              atpi[CONST_TPICONTENTTIME]=contenttime;
              studies[stidx].series[seidx].temporalpositions.push(atpi);
              studies[stidx].series[seidx].temporalpositions.sort(function (a, b) {
                var contentA =a[CONST_TPIINDEX];
                var contentB =b[CONST_TPIINDEX];
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
              });
            }
      }
      return ret;
    }
    function process_file(afile,dumpzindex){
        //prend une des entrées DICOM et la passe dans le grand tableau study[]
        //-1 = erreur
        //-2 = objet multiframe
        
        var newseries=false;
        var newstudy=false;
        if (afile.sopclassuid=='1.2.840.10008.5.1.4.1.1.4.1'){
          return -2;
        } else {
          if ((afile.sopclassuid=='1.2.840.10008.5.1.4.1.1.4')){
            var stidx=find_st(afile.stuid);
            if (stidx===-1){
              newstudy=true;
              var astudy=new Object;
              astudy.uid=afile.stuid;
              astudy.description=afile.stde;
              if (astudy.description==undefined){
                astudy.description='';
              }
              astudy.bodypart=afile.bodypart;
              astudy.protocolname=afile.protocolname;
              astudy.date=afile.stda;
              astudy.institution=afile.institution;
              //astudy.patient=afile.patient;
              astudy.manufacturer=afile.manufacturer;
              astudy.model=afile.model;
              astudy.softwareversion=afile.softwareversion;
              astudy.fieldstrength=afile.fieldstrength;
              astudy.series=[];
              astudy.series_groups=[];
              studies.push(astudy);
              //ajout de la div STUDY
              add_study_html(astudy);
            }
            stidx=find_st(afile.stuid);
            var seidx=find_se(stidx,afile.seuid);
            if (seidx===-1){
              newseries=true;
              //if (afile.fileEntry==0){
              //}
              var aseries=new Object;
              aseries.uid=afile.seuid;
              aseries.number=afile.number;
              aseries.description=afile.sede;
              aseries.time=afile.setm;
              aseries.groupuid=undefined;
              aseries.is_a_group_and_not_a_series=false;

              aseries.scansequence=afile.scansequence;
              aseries.scanvariant=afile.scanvariant;
              aseries.scanoptions=afile.scanoptions;
              aseries.imagetype=afile.imagetype;
              aseries.pulsesequencename=afile.pulsesequencename;

              aseries.rows=afile.rows;
              aseries.cols=afile.cols;
              aseries.orientation=afile.orientation;

              aseries.tr=afile.tr;
              aseries.te=afile.te;
              aseries.matrix=afile.matrix;
              aseries.fov=afile.fov;
              aseries.signature=afile.filesignature;

              aseries.pixelspacing=afile.pixelspacing;//ROW/COL
              if (aseries.pixelspacing==undefined){
                return -1;
              }
              aseries.acquired_pixelsize=afile.acquired_pixelsize;//phase/freq
              aseries.phaseencodingdirection =afile.phaseencodingdirection;
              aseries.phaseencodingdirection_ded =afile.phaseencodingdirection_ded;

              aseries.slicethickness=afile.slicethickness;
              aseries.rec_pixelsurface=Number(parseFloat(aseries.pixelspacing[0]*aseries.pixelspacing[1]).toFixed(2));
              aseries.rec_voxelvolume=Number(parseFloat(aseries.acquired_pixelsize[CONST_IN_PHASE]*aseries.acquired_pixelsize[CONST_IN_FREQUENCY]*aseries.slicethickness).toFixed(2));
              aseries.spacebetweenslices=afile.spacebetweenslices;
              aseries.duration=afile.acquisitionduration;
              aseries.contrast=afile.contrast;
              aseries.acquisitionnumber=afile.acquisitionnumber;
              aseries.postinjection=false;
              aseries.acquired_instead_of_reconstructed=afile.acquired_instead_of_reconstructed;


              aseries.sequencenames=[];
              aseries.bvalues=[];
              aseries.temporalpositions=[];
              aseries.acquisitiontimes=[];
              aseries.imagesCount=0;
              aseries.imageList=[];
              studies[stidx].series.push(aseries);




              var htmse='';
              var complement_reconstruit='';
              var complement_duree='';
              var duree=0;
              if (!aseries.acquired_instead_of_reconstructed){
                complement_reconstruit='<br><span class="label_seriesdescription_option">(derived from another)</span>';
              } else {
                duree=afile.acquisitionduration;
                complement_reconstruit='';
                complement_duree='<br><span class="label">t:</span><div class="dureeseq"><span class="dureeseqval">'+afile.acquisitionduration+'</span>&nbsp;sec</div>';
              }
              htmse+='<div class="column series_number"><div class="series_group" style="display:none;"></div><span class="badge bg-secondary">'+aseries.number+'</span><br><span class="setm">'+aseries.time+'</span>'+complement_duree+'</div>';
              htmse+='<div class="dicox_container"><div class="dicomImage" ref="'+afile.seuid+'" style="height:'+thumbsize+'px;width:'+thumbsize+';padding:3px;margin:1px;"></div><div class="noiseinfo" ref="'+afile.seuid+'"></div></div>';
              //<div class="smalllabel rowscount">'+aseries.rows+'</div><div class="smalllabel colscount">'+aseries.cols+'</div>
              htmse+='<div class="column series_description"><span class="label_seriesdescription" duration_sec="'+duree+'">'+aseries.description+'</span>'+complement_reconstruit+'<br><span class="series_orientation">'+afile.orientation+'</span><br><span class="badge bg-primary series_imagescount">'+aseries.imagesCount+'</span></div>';
              //FOV et pixelsize

              var seqdur=afile.acquisitionduration;
              if (seqdur==NaN){
                seqdur=''
              }
              htmse+='<div class="column series_geometry">';
              var geometry_labels=['FOV ph&bull;fq (mm)','Ph.enc.dir.','Matrix ph&bull;fq','Acq.pixl ph&bull;fq (mm)','Cols &bull; Rows (px)','Rec.pixl x&bull;y(mm)','Slc thickn. (mm)','Slc interv. (mm)'];
              var geometry_values=[];
              geometry_values.push(afile.fov[CONST_IN_PHASE]+'&nbsp;&bull;&nbsp;'+afile.fov[CONST_IN_FREQUENCY]);

              if (aseries.phaseencodingdirection==undefined){
                pre='<font color=red><b>';
                post='</b></font>';
                geometry_values.push(pre+aseries.phaseencodingdirection_ded+ph_enc_dir_sens(aseries.orientation,aseries.phaseencodingdirection_ded)+'&nbsp;<br><span class="minitext">(guessed from matrix)</span>'+post);
              } else {
                geometry_values.push(aseries.phaseencodingdirection+ph_enc_dir_sens(aseries.orientation,aseries.phaseencodingdirection));
              }
              geometry_values.push(afile.matrix[CONST_IN_PHASE]+'&nbsp;&bull;&nbsp;'+afile.matrix[CONST_IN_FREQUENCY]);
              geometry_values.push(afile.acquired_pixelsize[CONST_IN_PHASE]+'&nbsp;&bull;&nbsp;'+afile.acquired_pixelsize[CONST_IN_FREQUENCY]);
              geometry_values.push(afile.cols+'&nbsp;&bull;&nbsp;'+afile.rows);
              geometry_values.push(afile.pixelspacing.join('&nbsp;&bull;&nbsp;'));
                var pre='';
                var post='';
                if (afile.spacebetweenslices>afile.slicethickness){
                  pre='<font color=red><b>';
                  post='</b></font>';
                }
              geometry_values.push(pre+afile.slicethickness+post);
              geometry_values.push(pre+afile.spacebetweenslices+post);


              htmse+='<table >';
                for (var l=0;l<geometry_labels.length;l++){
                  htmse+='<tr>';
                    htmse+='<td><span class="label">'+geometry_labels[l]+'</span></td>';
                    htmse+='<td>'+geometry_values[l]+'</td>';
                  htmse+='</tr>';
                }
              htmse+='</table>';
              htmse+='</div>';//geometry_labels

              var it=afile.imagetype;
              var ito=it.split("\\");
              var htmsequenceinfo='<div class="column series_sequenceinfo">'+ito.join('<li>')+'<br><span class="label">sequence:</span>'+afile.scansequence+'<span class="label"> - variant:</span>'+afile.scanvariant+'<br>'+'<span class="label">options:</span>'+afile.scanoptions+'<br><span class="label">TR:</span><b>'+afile.tr+'</b>ms ; <span class="label">TE:</span><b>'+afile.te+'</b>ms<br><span class="sequencenames"></span><br>'+afile.pulsesequencename+'</div>';
              htmse+='<div class="column series_sequenceinfo">'+htmsequenceinfo+'</div>';
              htmse+='<div class="column series_sequencetype"></div>';

              //ajout de la div SERIES
              $('.study[uid="'+afile.stuid+'"]').find(".studycontent").append('<div class="series" uid="'+afile.seuid+'" data-sort="'+aseries.time.replaceAll(":","")+paddy(aseries.number,6)+'">'+htmse+'</div>');

              const element = $('.dicomImage[ref="'+afile.seuid+'"]')[0];
              cornerstone.enable(element);
              const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(fileEntries[afile.fileEntry]);
              loadAndViewImage(element,imageId);





            }
            seidx=find_se(stidx,afile.seuid);
            //ajout du temps au tableau de série acquisitiontimes[]
            studies[stidx].series[seidx].acquisitiontimes.push(afile.setm);    
            //ajout de la sous-séquence au tableau de série sequencenames[]
            if (add_sequencename_to_series(stidx,seidx,afile.sequencename)){
              var htmlsequencenames=studies[stidx].series[seidx].sequencenames.join("<li>");//attention à ne pas utiliser aseries qui n'est pas toujours defined
              $('.series[uid="'+studies[stidx].series[seidx].uid+'"]').find(".sequencenames").html(htmlsequencenames);
            }
            //ajout du tpi OU acquisitionnumber(Siemens) au tableau de série temporalpositions[]
            if (afile.temporalposition!=undefined){
              add_temporalposition_to_series(stidx,seidx,afile.temporalposition,afile.setm,afile.contenttm);
            } else {
                //cas particuleir de siemens qui fait soit de multiples séries dont le tpi est dans acquisition number, soit une grosse série avec un tpi par image dans le champ acquisiton number
                if (afile.acquisitionnumber!=undefined){
                  add_temporalposition_to_series(stidx,seidx,afile.acquisitionnumber,afile.setm,afile.contenttm);  
                } else {
                }          
            }

            //ajout du bvalue au tableau de série bvalues[]
            add_bvalue_to_series(stidx,seidx,afile.bvalue);
            //ajout de l'image au tableau imageList[]
            studies[stidx].series[seidx].imagesCount++;
              var animage=new Array();
              animage[CONST_IMAGEPOSITION]=afile.imageposition;
              animage[CONST_FILEENTRY]=afile.fileEntry;
            studies[stidx].series[seidx].imageList.push(animage);
          return 1;
        } else {
          return -1;
        }      
        }
    }
    function update_series_images_count_and_type(updateimages,refcaller){
      //https://dicom.nema.org/medical/dicom/current/output/html/part04.html#PS3.4
      //http://dicomlookup.com/lookup.asp?sw=Ttable&q=C.8-4
      var files_included=0;
      var groups_valid_count=0;
      for (var st=0;st<studies.length;st++){
        var stidx=studies[st].uid;
        var injected_series_numbers=new Array();
        for (var se=0;se<studies[st].series.length;se++){


          var studydata=studies[st];
          var seriesdata=studies[st].series[se];
          var curseuid=seriesdata.uid;
          var itx=seriesdata.imagetype;
          var itxo=itx.toLowerCase().split("\\");
          var series_signature=seriesdata.signature;

          if (refcaller=="final"){
          //####GESTION DES GROUPES DE SERIES
                    //on regarde s'il existe une autre série avec cette signature

                    var signature_found_in_another_series=-1;
                    for (var se2=0;se2<studies[st].series.length;se2++){
                      if ((studies[st].series[se2].signature==series_signature)&&(se2!=se)){
                        signature_found_in_another_series=se2;
                        break;
                      }
                    }
                    if (signature_found_in_another_series!=-1){
                        //si oui, il faut faire un groupe de séries dans la studydata
                        //mais d'abord on vérifie qu'il n'existe pas déjà
                        var sgfound=-1;
                        for (var sg=0;sg<studies[st].series_groups.length;sg++){
                          if ((studies[st].series_groups[sg][CONST_SG_SIGNATURE]==series_signature)){
                            sgfound=sg;
                            break;
                          }
                        }
                        if (sgfound==-1){
                           var aSeriesGroup=[];

                             aSeriesGroup[CONST_SG_BGCOLOR]="rgb("+getRandomInt(100)+" "+(70+getRandomIntRoundedTen(100))+" "+(60+getRandomInt(69))+" / 15%)";
                             aSeriesGroup[CONST_SG_SIGNATURE]=series_signature;
                             aSeriesGroup[CONST_SG_LABEL]=seriesdata.description;
                             aSeriesGroup[CONST_SG_UID]= ""+Date.now() +"_"+ Math.random();
                          //alert(aSeriesGroup[CONST_SG_UID]);
                               //generateRandomColorRgb();
                             aSeriesGroup[CONST_SG_SUBSERIES]=[];
                             var asubseries=[];
                              asubseries[CONST_SUBSERIESUID]=seriesdata.uid;
                              asubseries[CONST_SUBSERIESDESCRIPTION]=seriesdata.description;
                              asubseries[CONST_SUBSERIESNUMBER]=seriesdata.number;
                             aSeriesGroup[CONST_SG_SUBSERIES].push(asubseries);
                           studies[st].series_groups.push(aSeriesGroup);
                           sgfound=studies[st].series_groups.length-1;
                           studies[st].series[se].groupuid=sgfound;
                        } else {
                           var asubseries=[];
                              asubseries[CONST_SUBSERIESUID]=seriesdata.uid;
                              asubseries[CONST_SUBSERIESDESCRIPTION]=seriesdata.description;
                              asubseries[CONST_SUBSERIESNUMBER]=seriesdata.number;
                            studies[st].series_groups[sgfound][CONST_SG_SUBSERIES].push(asubseries);
                            studies[st].series_groups[sgfound][CONST_SG_LABEL]=findCommon(studies[st].series_groups[sgfound][CONST_SG_LABEL],seriesdata.description).trim();
                        }
                        studies[st].series[se].groupuid=sgfound;

                    }
               //supprimer les groupes qui n'ont qu'une seule série après l'analyse (elle sera malheureusement faite plusieurs fois)


          //####FIN de gestion de groupes de séries (on affichera ensuite)

          }


          var tpis=seriesdata.temporalpositions;
          var bvalueslist=seriesdata.bvalues;

          files_included+=seriesdata.imagesCount;
          var compte_avant=$('.series[uid="'+curseuid+'"]').find(".series_imagescount").html();
          if (false){//compte_avant==seriesdata.images on est obligé de tout recalculer à chaque fois car risque de penser que c'est pas injecté.
              studies[st].series[se].imagecount_just_changed=false;
              //$('.series[uid="'+curseuid+'"]').removeClass("updating");
          } else {
              //$('.series[uid="'+curseuid+'"]').addClass("updating");
              studies[st].series[se].imagecount_just_changed=true;
              $('.series[uid="'+curseuid+'"]').find(".series_imagescount").html(seriesdata.imagesCount);
              var zetest=null;
              var series_type='';
              var series_subtype='';
              var series_options='';
              var sure=false;
              var rules_positive=new Array();
              var rules_queue=new Array();

              var rules_start=["secondarycapture","survey_any_insede","test_vendor"];
              var rules_siemens=["t2_siemens_sequencename","t1_siemens_sequencename","ffe_siemens_sequencename","adc_siemens_sequencename","dwi_siemens_sequencename","dce_siemens_sequencename","adc_siemens_imagetype"];
              var rules_generic=["t2_any_bytr","t2_any_byserieslabel","t1_any_bytrte","ffe_any_complex","dcs_any_inimagetype","dce_any_tpis","adc_any_inimagetype","fatsat_any_inoptions","dwi_any_multipleb","dwi_any_singleb","dwi_any_imagetype"];
              var rules_philips=[];
              var rules_ge=["ge_t2_fiesta"];//https://www.gehealthcare.ca/products/interoperability/dicom/magnetic-resonance-imaging-dicom-conformance-statements
              var rules_hitachi=["adc_hitachi","dwi_hitachi","dce_hitachi"];//faire l'adc avant le dwi

              function get_fatsatoptions(){
                  var local_series_subtype='';
                  if (seriesdata.scanoptions!=undefined){
                    var optionsobj=seriesdata.scanoptions.toLowerCase().split("\\");

                    if (((contains(optionsobj,'fs'))||(contains(optionsobj,'dixw'))||(contains(optionsobj,'water')))&&(series_type!='dwi')&&(series_type!='adc')){
                      local_series_subtype='fatsat';
                    }
                  }
                  if (itx!=undefined){

                    if ((contains(itxo,"water"))){
                      local_series_subtype='fatsat';
                    }
                  }
                  return local_series_subtype;
              }
              function get_tpis_display(){
                  return get_subarray(tpis,CONST_TPIINDEX).join(";");
              }
              function get_dwis_display(){
                  return get_subarray(bvalueslist,CONST_BVALUE).join(";");
              }
              function apply_rule(zetest){
                //check this...https://radiopaedia.org/articles/mri-sequence-parameters
                    switch(zetest){
                      case "secondarycapture":
                        if (itx!=undefined){
                            if (itx.toLowerCase().indexOf("secondaryxx")!=-1){
                              series_type='sc';series_options="";sure=true;
                            }
                        }
                        break;
                      case "dwi_any_multipleb":
                        if (bvalueslist.length>1){
                            //all manufacturers
                            series_type='dwi';series_options=get_dwis_display();sure=true;
                            rules_positive.push(zetest);
                        }
                        break;
                      case "dwi_any_singleb":
                        //doit passer après t2_any_bytr
                        if (bvalueslist.length==1&&parseInt(bvalueslist[0][CONST_BVALUE])>0){
                            //all manufacturers
                            series_type='dwi';series_options=get_dwis_display();sure=false;//can also be an ADC map
                            rules_positive.push(zetest);
                        }
                        break;
                      case "dwi_any_imagetype":
                        if (itx!=undefined){
                          if ((contains(itxo,"diffusion"))||(contains(itxo,"dwi_mean"))){
                            series_type='dwi';series_options=get_dwis_display();sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "dwi_hitachi":
                        if (itx!=undefined){
                          if (contains(itx,"dw epi")){
                            series_type='dwi';series_options=get_dwis_display();sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "fatsat_any_inoptions":
                        var fatsaption=get_fatsatoptions();
                        if (fatsaption!=''){
                            series_subtype='fatsat';sure=false;
                            rules_positive.push(zetest);
                        }
                        break;
                      case "adc_hitachi":
                        if (itxo!=undefined){
                          if (contains(itxo,"diffusion map")){
                            series_type='adc';series_options=get_dwis_display();sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "adc_siemens_imagetype":
                        if (itx!=undefined){
                          if (itx.toLowerCase().indexOf("diffusion\\adc")!=-1){
                            series_type='adc';series_options=get_dwis_display();sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "adc_any_inimagetype":
                        if (itx!=undefined){

                          if ((contains(itxo,"adc"))){
                            //all manufacturers ; seen on GE
                            series_type='adc';series_options=get_dwis_display();sure=true;
                            rules_positive.push(zetest);
                          }
                          if ((contains(itxo,"eadc"))){
                            //all manufacturers ; seen on GE
                            series_type='adc_exp';series_options=get_dwis_display();sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "dce_hitachi":
                        if ((parseInt(seriesdata.acquisitionnumber)>0)){
                            //si injecté et 1 tpi
                            series_type='dce';series_subtype='';series_options=get_tpis_display();sure=true;
                            injected_series_numbers.push(seriesdata.time.replaceAll(":",""));
                            rules_positive.push(zetest);
                          }
                        break;
                      case "dce_any_tpis":
                        if (tpis.length>1){
                          series_type='dce';series_subtype='';series_options=get_tpis_display();sure=true;
                          injected_series_numbers.push(seriesdata.time.replaceAll(":",""));
                          rules_positive.push(zetest);
                        } else {
                          if ((seriesdata.contrast!=undefined)&&(tpis.length==1)&&(!contains_element_matching_rule(rules_positive,"*t2*"))&&(!contains_element_matching_rule(seriesdata.sequencenames,'*epi*'))&&(seriesdata.bvalues.length==0)){
                            //si injecté et 1 tpi
                            series_type='dce';series_subtype='';series_options=get_tpis_display();sure=true;
                            injected_series_numbers.push(seriesdata.time.replaceAll(":",""));
                            rules_positive.push(zetest);
                          }
                        }
                        var fatsaption=get_fatsatoptions();
                        if (fatsaption!=''){
                            series_subtype='fatsat';
                        }
                        break;
                      case "t1_siemens_sequencename":
                        if (seriesdata.sequencenames.length>0){
                          if ((contains_element_matching_rule(seriesdata.sequencenames,'*tse2d*'))&&(seriesdata.tr<=1100)){
                            series_type='t1';
                            series_subtype='tse';
                            series_options='';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        var fatsaption=get_fatsatoptions();
                        if (fatsaption!=''){
                            series_subtype='fatsat';
                        }
                        break;
                      case "t2_siemens_sequencename":
                        if (seriesdata.sequencenames.length>0){
                          if ((contains_element_matching_rule(seriesdata.sequencenames,'*tse2d*'))&&(seriesdata.tr>1100)){
                            series_type='t2';
                            series_subtype='tse';
                            series_options='';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        var fatsaption=get_fatsatoptions();
                        if (fatsaption!=''){
                            series_subtype='fatsat';
                        }
                        break;
                      case "dce_siemens_sequencename":
                        if (seriesdata.sequencenames.length>0){
                          if (contains_like(seriesdata.sequencenames,'dyn3d')||((contains_like(seriesdata.sequencenames,'fl3d1'))&&seriesdata.contrast!=undefined)){
                            series_type='dce';
                            if (tpis.length>0){
                              series_options=get_tpis_display();
                            } else {
                              series_options=seriesdata.acquisitionnumber;
                            }
                            if (itx.toLowerCase().indexOf("norm\\water")!=-1){
                              series_subtype='water';
                            }
                            if (itx.toLowerCase().indexOf("norm\\fat")!=-1){
                              series_subtype='fat';
                            }
                            if (itx.toLowerCase().indexOf("\\sub")!=-1){
                              series_type='dce_sub';
                            }
                            if (itx.toLowerCase().indexOf("\\wi")!=-1){
                              series_type='dce_wi';
                            }
                            if (itx.toLowerCase().indexOf("\\wo")!=-1){
                              series_type='dce_wo';
                            }
                            sure=true;
                            injected_series_numbers.push(seriesdata.time.replaceAll(":",""));
                            rules_positive.push(zetest);
                          }
                        }
                        var fatsaption=get_fatsatoptions();
                        if (fatsaption!=''){
                            series_subtype='fatsat';
                        }
                        break;
                      case "dwi_siemens_sequencename":
                        if (itx!=undefined){
                          if (itx.toLowerCase().indexOf("diffusion\\calc_bvalue")!=-1){
                            series_type='dwi';series_options=get_dwis_display();series_subtype='calc';sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                          if (itx.toLowerCase().indexOf("diffusion\\trace")!=-1){
                            //alert("DWI siemens trace");
                            series_type='dwi';series_options=get_dwis_display();series_subtype='trace';sure=true;//can also be an ADC map
                            rules_positive.push(zetest);
                          }
                        }
                        if (seriesdata.sequencenames.length>0){
                          if (contains_element_matching_rule(seriesdata.sequencenames,'*e*_b*t')){
                            for (var seqn=0;seqn<seriesdata.sequencenames.length;seqn++){
                              var theseqname=seriesdata.sequencenames[seqn];
                              theseqname=theseqname.replace("*ep_b","");
                              theseqname=theseqname.replace("*ez_b","");
                              theseqname=theseqname.replace("*re_b","");//resolve
                              theseqname=theseqname.replace("t","");
                              add_bvalue_to_series(st,se,theseqname);
                            }
                            series_type='dwi';
                            series_options=get_dwis_display();
                            series_subtype='trace';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                          if (contains_element_matching_rule(seriesdata.sequencenames,'*e*_b*d')){
                            for (var seqn=0;seqn<seriesdata.sequencenames.length;seqn++){
                              var theseqname=seriesdata.sequencenames[seqn];
                              theseqname=theseqname.replace("*ep_b","");
                              theseqname=theseqname.replace("*ez_b","");//zoom
                              theseqname=theseqname.replace("*re_b","");//resolve
                              theseqname=theseqname.replace("d","");
                              add_bvalue_to_series(st,se,theseqname);
                            }
                            series_type='dwi';
                            series_options=get_dwis_display();
                            series_subtype='trace';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                          if (contains_element_matching_rule(seriesdata.sequencenames,'*e*_calc_*')){
                            for (var seqn=0;seqn<seriesdata.sequencenames.length;seqn++){
                              var theseqname=seriesdata.sequencenames[seqn];
                              //alert("j'ai trouvé "+theseqname);
                              theseqname=theseqname.replace("*ez_calc_b","");
                              theseqname=theseqname.replace("*ep_calc_b","");
                              theseqname=theseqname.replace("*re_calc_b","");
                              add_bvalue_to_series(st,se,theseqname);
                            }
                            series_type='dwi';
                            series_options=get_dwis_display();
                            series_subtype='calc';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "adc_siemens_sequencename":
                        if (seriesdata.sequencenames.length>0){
                          if (contains_element_matching_rule(seriesdata.sequencenames,'*ep_b*_*')){
                            for (var seqn=0;seqn<seriesdata.sequencenames.length;seqn++){
                              var theseqname=seriesdata.sequencenames[seqn];
                              theseqname=theseqname.replace("*ep_","");
                              series_options=theseqname;
                            }
                            series_type='adc';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "dcs_any_inimagetype":
                        if (itx!=undefined){
                          if (itx.toLowerCase().indexOf("subtra")!=-1){
                            //siemens ok
                            series_type='dce_sub';
                            series_subtype='';
                            if (tpis.length>0){
                              series_options=get_tpis_display();
                            } else {
                              series_options=seriesdata.acquisitionnumber;
                            }
                            sure=true;
                            injected_series_numbers.push(seriesdata.time.replaceAll(":",""));
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "t1_any_bytrte":
                        if (seriesdata.scansequence!=undefined){
                          switch (seriesdata.scansequence){
                            case "GR":
                              if (seriesdata.tr<210&&seriesdata.te<10){
                                series_type='t1';series_options='';sure=false;rules_positive.push(zetest);
                                series_subtype='eg';
                              }
                              break;
                            case "SE":
                              if (seriesdata.tr<900&&seriesdata.te<40){
                                series_type='t1';series_options='';sure=false;rules_positive.push(zetest);
                                series_subtype='se';
                              }
                            break;
                          }
                        }
                        if (itx!=undefined){
                            if (itx.toLowerCase().indexOf("norm\\water")!=-1){
                              //siemens
                              series_subtype='water';
                            }
                            if (itx.toLowerCase().indexOf("norm\\fat")!=-1){
                              //siemens
                              series_subtype='fat';
                            }
                        }
                        break;
                      case "t2_any_bytr":
                        if (seriesdata.tr>1500){
                              if ((bvalueslist.length==1&&parseInt(bvalueslist[0][CONST_BVALUE])>0)==false){//sauf si diffusion
                                series_type='t2';series_options='';sure=false;rules_positive.push(zetest);
                              }
                        }
                        break;
                      case "t2_any_byserieslabel":
                        if (seriesdata.description!=undefined){
                          if (seriesdata.description.toLowerCase().indexOf("t2")!=-1){
                                series_type='t2';series_options='';sure=false;rules_positive.push(zetest);
                          }                  
                        }
                        break;
                      case "ffe_any_complex":
                        if (itx!=undefined){
                          if ((itx.toLowerCase().indexOf("ffe")!=-1)&&seriesdata.scanvariant=="SS"){//FFE with Steady State
                            series_subtype='ffe';
                            series_type='t2';
                            series_options='';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "ge_t2_fiesta":
                        if ((seriesdata.scanoptions!=undefined)){

                           var optionsobj=seriesdata.scanoptions.toLowerCase().split("\\");

                          if (((contains(optionsobj,'fast_gems'))&&(contains(optionsobj,'edr_gems')))&&seriesdata.scanvariant=="SS"&&seriesdata.scansequence=="GR"){//FFE with Steady State
                            series_subtype='ffe';
                            series_type='t2';
                            series_options='';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "ffe_siemens_sequencename":
                        if (seriesdata.sequencenames.length>0){
                          if ((contains_element_matching_rule(seriesdata.sequencenames,'*tfi2d*'))&&(seriesdata.scanvariant=="SS"||seriesdata.scanvariant=="SS\\OSP")){
                            series_subtype='ffe';
                            series_type='t2';
                            series_options='';
                            sure=true;
                            rules_positive.push(zetest);
                          }
                        }
                        break;
                      case "survey_any_insede":
                        if (seriesdata.description!=undefined){
                          if ((seriesdata.description.toLowerCase().indexOf("survey")!=-1)){
                                series_options='survey';sure=true;
                                rules_positive.push(zetest);
                          } else {
                            if ((seriesdata.description.toLowerCase().indexOf("loca")!=-1)){
                                series_options='survey';sure=false;
                                rules_positive.push(zetest);
                            }
                          }
                        }
                        break;
                      case "test_vendor":
                        if (studydata.manufacturer.toLowerCase().indexOf("siemens")!=-1){
                          rules_queue=rules_siemens.concat(rules_generic);
                        } else {
                          if (studydata.manufacturer.toLowerCase().indexOf("philips")!=-1){
                            rules_queue=rules_philips.concat(rules_generic);
                          } else {
                              if (studydata.manufacturer.toLowerCase().indexOf("ge medical systems")!=-1){
                                rules_queue=rules_ge.concat(rules_generic);
                              } else {
                                  if (studydata.manufacturer.toLowerCase().indexOf("hitachi")!=-1){
                                    rules_queue=rules_hitachi.concat(rules_generic);
                                  } else {
                                    rules_queue=rules_generic;
                                  }
                              }
                          }
                        }
                        break;
                    }        
              }
              var continuer_queue=true;
              rules_queue=rules_start;
              while (continuer_queue){
                zetest=rules_queue.shift();
                if (!sure){
                  apply_rule(zetest);
                }
                continuer_queue=rules_queue.length>0;
              }
              //if (series_type!=''){
                var type_label='';
                studies[st].series[se].series_type=series_type;
                studies[st].series[se].series_subtype=series_subtype;
                studies[st].series[se].series_options=series_options;
                studies[st].series[se].series_options=rules_positive.join(",");
                switch (series_type){
                    case "dce":type_label="DCE";break;
                    case "dce_sub":type_label="DCE(sub)";studies[st].series[se].acquired_instead_of_reconstructed=false;break;
                    case "dce_wo":type_label="DCE(wash-out)";studies[st].series[se].acquired_instead_of_reconstructed=false;break;
                    case "dce_wi":type_label="DCE(wash-in)";studies[st].series[se].acquired_instead_of_reconstructed=false;break;
                    case "t1":type_label="T1-w";break;
                    case "t2":type_label="T2-w";break;
                    case "dwi":type_label="DWI";break;
                    case "sc":type_label="Secondary capture";break;
                    case "adc":type_label="ADC map";studies[st].series[se].acquired_instead_of_reconstructed=false;break;
                    case "adc_exp":type_label="ADC exp map";studies[st].series[se].acquired_instead_of_reconstructed=false;break;
                    default:type_label=series_type;break;

                        }
                $('.series[uid="'+studies[st].series[se].uid+'"]').find(".series_sequencetype").html('<div class="series_type" ref="'+series_type+'">'+type_label+'</div><div class="series_subtype">'+series_subtype+'</div><div class="series_options">'+series_options+'</div><div class="series_postinjection"></div>');
                $('.series[uid="'+studies[st].series[se].uid+'"]').find(".series_sequencetype").attr("rules",rules_positive.join(","));
              //}
          }


        }


        //recherhcer les séries post-injection et maj acquisition times
        injected_series_numbers.sort();
            var tat=0;
              var stidx=studies[st].uid;
              for (var se=0;se<studies[st].series.length;se++){
                    var seriesdata=studies[st].series[se];
                    seriesdata.acquisitiontimes.sort();
                    if (seriesdata.acquired_instead_of_reconstructed){
                        if ((isNaN(studies[st].series[se].duration))&&(refcaller=="final")){
                          var nbacqtimes=studies[st].series[se].acquisitiontimes.length;
                          var date1 = new Date("2015/07/30 "+studies[st].series[se].acquisitiontimes[studies[st].series[se].acquisitiontimes.length-1]);    
                          var date2 = new Date("2015/07/30 "+studies[st].series[se].acquisitiontimes[0]);
                          var diff = (date2 - date1)/1000;
                          studies[st].series[se].duration = Math.abs(Math.floor(diff));
                          var complement_duree='<span class="dureeseqval">'+studies[st].series[se].duration+'</span>&nbsp;sec';
    $('.series[uid="'+studies[st].series[se].uid+'"]').find(".dureeseq").first().html(complement_duree);
                        }
                        tat+=studies[st].series[se].duration;
                    }


                    var group_prefix='0';
                    if (seriesdata.groupuid==undefined){
                      if (seriesdata.postinjection){
                        group_prefix='999';
                      } else {
                        group_prefix='000';
                      }
                    } else {
                      group_prefix=paddy(seriesdata.groupuid+1,3);
                    }
                    seriesdata.datasort=group_prefix+seriesdata.acquisitiontimes[0].replaceAll(":","")+paddy(seriesdata.number,6);
                    $('.series[uid="'+seriesdata.uid+'"]').find(".setm").html(seriesdata.acquisitiontimes[0]);
                    $('.series[uid="'+seriesdata.uid+'"]').attr("data-sort",seriesdata.datasort);
                    //maj du statut postgado

                    var setime=seriesdata.time.replaceAll(":","");
                    if (setime>=injected_series_numbers[0]){
                        seriesdata.postinjection=true;
                        $('.series[uid="'+seriesdata.uid+'"]').find(".series_postinjection").html("post_gd");
                    } else {
                        seriesdata.postinjection=false;
                        $('.series[uid="'+seriesdata.uid+'"]').find(".series_postinjection").html("");
                    }              
                //}
              }
              if (tat==0){
                $('.study[uid="'+studies[st].uid+'"]').find(".tat").html("n.c");
              } else {
                //$('.study[uid="'+studies[st].uid+'"]').find(".tat").html(fancyTimeFormat(tat));
              }

            //}
        //}
        if(true){
          //for (var st2=0;st2<studies.length;st2++){
            var stidx=studies[st].uid;
            //chaque fois qu'on ajoute une nouvelle série on les retrie
            var result = $('.study[uid="'+studies[st].uid+'"]').find('.series').sort(function (a, b) {
                var contentA =parseInt( $(a).data('sort'));
                var contentB =parseInt( $(b).data('sort'));
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
            });
            studies[st].series.sort(function (a, b) {
                var contentA =parseInt( a.datasort);
                var contentB =parseInt( b.datasort);
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
            });
            $('.study[uid="'+studies[st].uid+'"]').find(".studycontent").html(result);
          //}      
        }//se
        if (refcaller=="final"){
                //maintenant la durée totale de l'examen
                var heures=[];
                var latest_time='';
                $('.studycontent').find(".series").each(function( index ) {
                    var h1=$(this).find(".setm").first().html();
                    if (h1.length==8){
                      heures.push(h1);
                    }
                });
                heures.sort(function (a, b) {
                  var contentA =time_to_ms(a);
                  var contentB =time_to_ms(b);
                  return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                });
                var date1 = new Date("2015/07/30 "+heures[heures.length-1]);    
                var date2 = new Date("2015/07/30 "+heures[0]);
                var diff = (date1 - date2)/1000;
                var duree_last_sequence=0;
                $('.studycontent').find(".series").each(function( index ) {
                    var h1=$(this).find(".setm").first().html();
                    if (h1==heures[heures.length-1]){
                      duree_last_sequence=parseInt($(this).find(".dureeseqval").html());
                    }
                });
                var duree_examen=diff;
                if ((!isNaN(duree_last_sequence))&&(duree_last_sequence>0)){
                  duree_examen+=duree_last_sequence;
                }
                $('.study[uid="'+studies[st].uid+'"]').find(".tat").html(fancyTimeFormat(duree_examen));

                //compter toutes les images
                var nbt=0;
                for (var se=0;se<studies[st].series.length;se++){
                    nbt+=studies[st].series[se].imageList.length;
                }
                $(".analyzed_count").html(nbt);
         }
      }//st
      if (updateimages){
            //on reparcoure chaque série et on trie les images par position, pour prendre celle du milieu
            for (var st=0;st<studies.length;st++){
              var stidx=studies[st].uid;
              for (var se=0;se<studies[st].series.length;se++){
                      switch (studies[st].series[se].orientation){
                        case "SAGITTAL":
                          studies[st].series[se].imageList.sort(function (a, b) {
                            var contentA =parseFloat(a[CONST_IMAGEPOSITION].split("\\")[0]);
                            var contentB =parseFloat(b[CONST_IMAGEPOSITION].split("\\")[0]);
                            return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                          });
                          break;
                        case "AXIAL":
                          studies[st].series[se].imageList.sort(function (a, b) {
                            var contentA =parseFloat(a[CONST_IMAGEPOSITION].split("\\")[2]);
                            var contentB =parseFloat(b[CONST_IMAGEPOSITION].split("\\")[2]);
                            return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                          });
                          break;
                        case "CORONAL":
                          studies[st].series[se].imageList.sort(function (a, b) {
                            var contentA =parseFloat(a[CONST_IMAGEPOSITION].split("\\")[1]);
                            var contentB =parseFloat(b[CONST_IMAGEPOSITION].split("\\")[1]);
                            return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                          });
                          break;
                      }
                      const element = $('.dicomImage[ref="'+studies[st].series[se].uid+'"]')[0];
                      //cornerstone.enable(element);
                      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(fileEntries[studies[st].series[se].imageList[parseInt(studies[st].series[se].imageList.length/2)][CONST_FILEENTRY]]);
                      loadAndViewImage(element,imageId);
                //}
              }      
            }
      }//updateimages  

      if (refcaller=="final"){
          $(".series_group").hide();
          for (var st=0;st<studies.length;st++){
                var groups=studies[st].series_groups;
                for (var gr=0;gr<groups.length;gr++){
                  var series_in_this_group=groups[gr][CONST_SG_SUBSERIES];
                  for (var subse=0;subse<series_in_this_group.length;subse++){
                    var subseuid=series_in_this_group[subse][CONST_SUBSERIESUID];
                    $('.series[uid="'+subseuid+'"]').find(".series_group").html("<b>GROUP&nbsp;"+(gr+1)+"</b><br>"+groups[gr][CONST_SG_LABEL]).show();
                    $('.series[uid="'+subseuid+'"]').css("background-color",groups[gr][CONST_SG_BGCOLOR]);
                  }
                }
          }




      }
      return files_included;
    }

//######################################################################
//Affichage en HTML, mise à jour des updates, etc...
//######################################################################
    function add_study_html(astudy){
        var htmstudy='<div class="study" uid="'+astudy.uid+'">';
        htmstudy+='<table class="study_header_table">';
          htmstudy+='<tr >';
              htmstudy+='<td class="headgroupcell">';//patient
                htmstudy+='<table>';
                  //htmstudy+='<tr><td class="tagtitle label">Patient</td><td>Data not read from file</td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Institution</td><td><input class="form-control studydataeditable" ref="institution" type="text" placeholder="" aria-label="" value="'+astudy.institution+'"></td></tr>';
                htmstudy+='</table>';
              htmstudy+='</td>';
              htmstudy+='<td class="headgroupcell">';//study
                htmstudy+='<table>';
                  htmstudy+='<tr><td class="tagtitle label">Study description</td><td><input class="form-control studydataeditable" ref="studydescription" type="text" placeholder="" aria-label="" value="'+astudy.description+'"></td></tr>';
      htmstudy+='<tr><td class="tagtitle label">Protocol name</td><td><input class="form-control studydataeditable" ref="protocolname" type="text" placeholder="" aria-label="" value="'+astudy.protocolname+'"></td></tr>';
      htmstudy+='<tr><td class="tagtitle label">Body part</td><td><input class="form-control studydataeditable" ref="bodypart" type="text" placeholder="" aria-label="" value="'+astudy.bodypart+'"></td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Date</td><td><input type="text" readonly class="form-control-plaintext" value="'+astudy.date+'"></td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Images found</td><td><span class="analyzed_count badge bg-primary" style="font-size:1.3em;"></span></td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Est. examination duration</td><td><span class="tat"></span></td></tr>';
                htmstudy+='</table>';
              htmstudy+='</td>';
              htmstudy+='<td class="headgroupcell">';//device
                htmstudy+='<table>';
                  htmstudy+='<tr><td class="tagtitle label">Manufacturer</td><td>'+astudy.manufacturer+'</td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Model</td><td>'+astudy.model+'</td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Software version</td><td>'+astudy.softwareversion+'</td></tr>';
                  htmstudy+='<tr><td class="tagtitle label"><u>Estimated</u> service</td><td><div id="estimatedservice">'+get_model_service_year(astudy.manufacturer,astudy.model,astudy.softwareversion)+'</div></td></tr>';
                  htmstudy+='<tr><td class="tagtitle label">Magnetic field strength</td><td>'+astudy.fieldstrength+'T</td></tr>';
                htmstudy+='</table>';
              htmstudy+='</td>';
          htmstudy+='</tr>';
        htmstudy+='</table>';
        htmstudy+='<div class="studycontent">&nbsp;</div>';
      htmstudy+='</div>';
      $("#studies").append(htmstudy);
      $(".studydataeditable").unbind("input");
      $(".studydataeditable").on("input", function(){
          $(this).addClass("unsaved");
          var intervalle_precedent=$(this).attr("intervalID");
          if (intervalle_precedent!==undefined){
            clearTimeout(intervalle_precedent);
          }
          var stuid=$(this).closest(".study").attr("uid");
          var fieldname=$(this).attr("ref");
          var valeur=$(this).val();
          var intervalID=setTimeout(function(){ update_study_field(stuid,fieldname,valeur); }, 500);
          $(this).attr("intervalID",intervalID);
      });
      
    }
    function add_series_html(aseries){
              var complement_reconstruit='';
              var complement_duree='';
              var duree=0;
              if (!aseries.acquired_instead_of_reconstructed){
                complement_reconstruit='<br><span class="label_seriesdescription_option">(derived from another)</span>';
              } else {
                if (aseries.duration!=null){
                    duree=aseries.duration;
                    complement_reconstruit='';
                    complement_duree='<br><span class="label">t:</span><div class="dureeseq"><span class="dureeseqval">'+duree+'</span>&nbsp;sec</div>';
                }
              }

        var htmstudy='<div class="series" uid="'+aseries.uid+'" data-sort="">';
          htmstudy+='<div class="column series_number">';
             htmstudy+='<div class="series_group" style="display:none;"></div>';
             htmstudy+='<span class="badge bg-secondary consolidate_series">'+aseries.number+'</span>';
             htmstudy+='<br>';
             htmstudy+='<span class="setm">'+aseries.time+'</span>';
             htmstudy+='<br>';
             htmstudy+=complement_duree;
          htmstudy+='</div>';
          htmstudy+='<div class="dicox_container">';
              if ((aseries.thumbpath!='')&&(aseries.thumbpath!="undefined")&&(aseries.thumbpath!=undefined)){
                htmstudy+='<img src="'+aseries.thumbpath+'">';
              }
              htmstudy+='<div class="noiseinfo" ref="'+aseries.uid+'"></div>';
          htmstudy+='</div>';
          htmstudy+='<div class="column series_description">';
             htmstudy+='<span class="label_seriesdescription" duration_sec="'+duree+'">'+aseries.description+'</span>'+complement_reconstruit;
             htmstudy+='<br>';
             htmstudy+='<span class="series_orientation">'+aseries.orientation+'</span>';
             htmstudy+='<br>';
             htmstudy+='<span class="badge bg-primary series_imagescount">'+aseries.imagesCount+'</span>';
             htmstudy+='<br>';
          htmstudy+='</div>';
          htmstudy+='<div class="column series_geometry">';
             htmstudy+='<table>';
                htmstudy+='<tr><td><span class="label">FOV ph&bull;fq (mm)</span></td>';
                htmstudy+='<td>'+aseries.fov[CONST_IN_PHASE]+'&nbsp;•&nbsp;'+aseries.fov[CONST_IN_FREQUENCY]+'</td>';;
                htmstudy+='</tr>';

                htmstudy+='<td><span class="label">Ph.enc.dir.</span></td>';
                  var pre='';var post='';
                  htmstudy+='<td>';
                  if (aseries.phaseencodingdirection==undefined){
                    pre='<font color=red><b>';
                    post='</b></font>';
                    htmstudy+=(pre+aseries.phaseencodingdirection_ded+ph_enc_dir_sens(aseries.orientation,aseries.phaseencodingdirection_ded)+'&nbsp;<br><span class="minitext">(guessed from matrix)</span>'+post);
                  } else {
                    htmstudy+=(aseries.phaseencodingdirection+ph_enc_dir_sens(aseries.orientation,aseries.phaseencodingdirection));
                  }
                  htmstudy+='</td>';
                htmstudy+='</tr>';
                htmstudy+='<td><span class="label">Matrix ph•fq</span></td>';
                htmstudy+='<td>'+aseries.matrix[CONST_IN_PHASE]+'&nbsp;&bull;&nbsp;'+aseries.matrix[CONST_IN_FREQUENCY]+'</td>';;
                htmstudy+='</tr>';
                htmstudy+='<td><span class="label">Acq.pixl ph&bull;fq (mm)</span></td>';
                htmstudy+='<td>'+aseries.acquired_pixelsize[CONST_IN_PHASE]+'&nbsp;&bull;&nbsp;'+aseries.acquired_pixelsize[CONST_IN_FREQUENCY]+'</td>';;
                htmstudy+='</tr>';
                htmstudy+='<td><span class="label">Cols • Rows (px)</span></td>';
                htmstudy+='<td>'+aseries.cols+'&nbsp;&bull;&nbsp;'+aseries.rows+'</td>';;
                htmstudy+='</tr>';
                htmstudy+='<td><span class="label">Rec.pixl x•y(mm)</span></td>';
                htmstudy+='<td>'+aseries.pixelspacing.join('&nbsp;&bull;&nbsp;')+'</td>';;
                htmstudy+='</tr>';
                var pre='';
                var post='';
                if (aseries.spacebetweenslices>aseries.slicethickness){
                  pre='<font color=red><b>';
                  post='</b></font>';
                }
                htmstudy+='<td><span class="label">Slc thickn. (mm)</span></td>';
                htmstudy+='<td>'+pre+aseries.slicethickness+post+'</td>';
                htmstudy+='</tr>';
                htmstudy+='<td><span class="label">Slc interv. (mm)</span></td>';
                htmstudy+='<td>'+pre+aseries.spacebetweenslices+post+'</td>';
                htmstudy+='</tr>';
             htmstudy+='</table>';
          htmstudy+='</div>';




              var it=aseries.imagetype;
              var htmlsequencenames=aseries.sequencenames.join("<li>");//attention à ne pas utiliser aseries qui n'est pas toujours defined
              var ito=it.split("\\");
              var htmsequenceinfo='<div class="column series_sequenceinfo">'+ito.join('<li>')+'<br><span class="label">sequence:</span>'+aseries.scansequence+'<span class="label"> - variant:</span>'+aseries.scanvariant+'<br>'+'<span class="label">options:</span>'+aseries.scanoptions+'<br><span class="label">TR:</span><b>'+aseries.tr+'</b>ms ; <span class="label">TE:</span><b>'+aseries.te+'</b>ms<br><span class="sequencenames">'+htmlsequencenames+'</span><br>'+aseries.pulsesequencename+'</div>';
              htmstudy+='<div class="column series_sequenceinfo">'+htmsequenceinfo+'</div>';

          htmstudy+='<div class="column series_sequencetype" rules="">';
          htmstudy+='</div>';
        htmstudy+='</div>';
        $(".studycontent").append(htmstudy);
    }
    function ph_enc_dir_sens(orientation,x){
      var ret='';
      switch (orientation){
        case "AXIAL":
          switch (x){
            case "ROW": ret= "&nbsp;(A/P)";break;
            case "COL": ret=  "&nbsp;(R/L)";break;
          }
          break;
        case "SAGITTAL":
          switch (x){
            case "ROW": ret=  "&nbsp;(C/C)";break;
            case "COL": ret=  "&nbsp;(A/P)";break;
          }
          break;
        case "CORONAL":
          switch (x){
            case "ROW": ret=  "&nbsp;(C/C)";break;
            case "COL": ret=  "&nbsp;(R/L)";break;
          }
          break;
      }
      return ret;
    }
    function update_status(){
          if ((error_list.length>0)||(global_cancel_alert==true)||(files_multiframe>0)){
            $('#status').removeClass('alert-success alert-info alert-warning').addClass('alert-danger');
          } else {
            $('#status').removeClass('alert-danger alert-info alert-warning').addClass('alert-success');
          }
          document.getElementById('statusText').innerHTML = progress_text+'<br>'+error_list.join('<br>');
    }
    //######################################################################
    //Reset
    //######################################################################
        function reset_explorer(){
            dumpz=[];
            studies=[];
            global_cancel_alert=false;
            error_list=[];
            files_processed=0;
            files_ignored=0;
            files_multiframe=0;
            $('#studies').html("");
            $('.badge').removeClass("consolidate_series");
            $(".series_group").hide();
            clearTimeout($("#status").attr("timeout_id"));
            $("#status").fadeIn();
            $("#info_startup").fadeIn();
            $("#dragzone").fadeIn();
            $("#explorer_navbar").hide();
            $("#searchtext").val("");
            progress_text="Ready to go...";

            for (var p=0;p<mrtests.length;p++){
              var thetest=mrtests[p];
              window[thetest+"_dataset_changed"];
            }

            update_status();
        }
        function reset_analysis(){
            $(".main_test_div").hide();
        }
        function reset_all(){
          reset_explorer();
          reset_analysis();
        }
//######################################################################
//Interface (drop de fichiers)
//######################################################################
    var soundFile = document.createElement("audio");
    soundFile.preload = "auto";
    //Load the sound file (using a source element for expandability)
    var src = document.createElement("source");
    src.src = "finished" + ".mp3";
    soundFile.appendChild(src);
    //Load the audio tag
    //It auto plays as a fallback
    soundFile.load();
    soundFile.volume = 1.000000;

    //Plays the sound
    function play() {
       //Set the current time for the audio file to the beginning
       soundFile.currentTime = 0.01;
       soundFile.volume = 1.000000;

       //Due to a bug in Firefox, the audio needs to be played after a delay
       setTimeout(function(){soundFile.play();},1);
    }
    function get_the_drop(event){
            event.stopPropagation(); // Stops some browsers from redirecting.
            event.preventDefault();
            reset_all();
            progress_text="Analyzing dropped content...";
            update_status();
            $("#dragzone").hide();

            var items = event.dataTransfer.items;



            start_analysis = new Date().getTime();
            var retour = getAllFileEntries(items,function(e){
              if (true) {//(confirm('Are you sure you want to read the '+fileEntries.length+' files ?'))
                // lancer les n get_tags (c'est ASYNCHRONE)

                var total_dropped=fileEntries.length;
                //alert(total_dropped);
                for (var f=0;f<fileEntries.length;f++){
                  var ftags=(get_tags(fileEntries[f]));
                  ftags.fileEntry=f;
                  dumpz.push(ftags);
                }
                // les attendre
                monintervalle=setInterval(function() {
                    if (fonctions_get_tags_en_attente===0){
                      // quand ils sont tous arrivés, les traiter...
                      progress_text="Sorting dataset files into series...";
                      update_status();
                      var total_todo=dumpz.length;
                      monintervalle_processfile=setInterval(function(evt) {
                        var resultat=0;
                        if (dumpz.length>0){
                          files_processed++;
                          if (global_cancel_alert==false){
                            resultat=process_file(dumpz[dumpz.length-1],dumpz.length-1);    
                          } else {
                            files_ignored=files_ignored+dumpz.length;
                            dumpz=[];
                          }
                          if (global_cancel_alert==false){
                              if (resultat<=0){
                                //alert("ignored");
                                files_ignored++;
                                if (resultat==-2){
                                  files_multiframe++;
                                }
                              }
                              dumpz.pop();
                              var dizieme_total=parseInt(total_dropped/10);
                              var updatethumbs=(files_processed % dizieme_total === 0);
                              if (files_processed % 25 === 0) {
                                  progress_text="Sorting dataset files into series...<br>("+parseInt((files_processed)/total_todo*100)+"% out of "+total_todo+" files...) ; "+files_ignored+" files ignored.<br>";
                                  //progress_text+='<div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-label="Animated striped example" aria-valuenow="'+parseInt((files_processed)/total_todo*100)+'" aria-valuemin="0" aria-valuemax="100" style="width: 75%"></div></div>';
                                  $(".analyzed_count").html(files_processed);
                                  update_status();
                                  update_series_images_count_and_type(updatethumbs,"intervalle");
                              }
                          }
                        } else {
                          //plus rien dans les dumpz : on a fini !
                          var files_included=update_series_images_count_and_type(true,"final");
                          end_analysis = new Date().getTime();
                          var time = end_analysis - start_analysis;
                          if (global_cancel_alert==false){
                            progress_text="Sorted "+files_processed+" DICOM files<br>("+files_ignored+" ignored).<br>Execution time: "+Math.round(time/1000)+"&nbsp;sec";
                            $('.badge.bg-secondary').addClass("consolidate_series",{duration:500});
                            if (files_multiframe>0){
                              progress_text+='<br>The dataset contained '+files_multiframe+' enhanced (multiframe) files that COULD NOT be analyzed. You need to expand them manually and rescan.';
                            }
                          } else {
                            progress_text="Processing ABORTED<br>("+files_ignored+" files ignored).<br>Execution time: "+Math.round(time/1000)+"&nbsp;sec";
                            $('.badge.bg-secondary').addClass("nonconsolidated_series",{duration:500});
                          }
                          update_status();
                          $(".analyzed_count").html(files_processed);
                          //alert("All files received\n"+files_processed+" files processed\n"+files_included+" files analyzed");
                          clearInterval(monintervalle_processfile);
                          var test_id_or_false=try_to_find_a_test();
                          if (test_id_or_false!=false){
                            var retour_test=run_quality_test(test_id_or_false);
                          }
                          $("#status").attr("timeout_id",monintervalle_processfile=setTimeout(function(evt) {
                              progress_text="Analysis of this dataset took "+Math.round(time/1000)+"&nbsp;sec<br>Ready to start again...";
                              update_status();
                              clearTimeout($("#status").attr("timeout_id"));
                          },10000));
                          $("#explorer_navbar").show();
                          $("#savedataset_button").show();
                          play();
                        }
                      },50);
                      clearInterval(monintervalle);
                    } else {
                      progress_text="Searching for DICOM information in the dataset...<br>("+parseInt((total_dropped-fonctions_get_tags_en_attente)/total_dropped*100)+"% out of "+fileEntries.length+" files)...";
                      //progress_text+='<div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-label="Animated striped example" aria-valuenow="'+parseInt((total_dropped-fonctions_get_tags_en_attente)/total_dropped*100)+'" aria-valuemin="0" aria-valuemax="100" style="width: 75%"></div></div>';
                      update_status();
                    }
                }, (1000));


              } else {
                // Do nothing!
              }


            }, function (){
              alert("No file found in your drop !");
              reset_all();
            });  
    }

//######################################################################
//Gestion de l'interface de la DB
//######################################################################
    function update_db_list(){
        var manufacturer=$('.searchinput[ref="manufacturer"]').val();
        var model=$('.searchinput[ref="model"]').val();
        var softwareversion=$('.searchinput[ref="softwareversion"]').val();
        var field=$('.searchinput[ref="fieldstrength"]').val();
        var description=$('.searchinput[ref="description"]').val();
        var gdate=$('.searchinput[ref="date"]').val();
        var idx=$('.searchinput[ref="index"]').val();
        $.ajax({
            type: "POST",
            url: "dbio.php",
            data: {
              "action": "load_studies",
              "manufacturer":manufacturer,
              "model":model,
              "softwareversion":softwareversion,
              "fieldstrength":field,
              "description":description,
              "date":gdate,
              "idx":idx
            },
            dataType: 'json',
            success: function(msg) {
              if (msg.status==="success"){
                var manufacturers=[];
                $(".dataline").remove();
                var nbex=msg.liste.length;
                $("#search_count").html(nbex+" datasets found");
                if (msg.had_filters){
                  $("#clear_search").show();
                } else {
                  $("#clear_search").hide();
                }

                var htm='';
                for (var e=0;e<nbex;e++){
                  htm+='<tr class="dataline">';
                    htm+='<td>';
                      htm+=msg.liste[e].manufacturer;
                      manufacturers.push(capitalizeFirstLetter(msg.liste[e].manufacturer.toLowerCase()));
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].model;
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].softwareversion;
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].fieldstrength;
                    htm+='</td>';
                    htm+='<td>';
                      if (msg.liste[e].thumbpath!=undefined){
                      htm+='<img src="'+msg.liste[e].thumbpath[0]+'" width="128px">';
                      }
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].description;
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].date;
                    htm+='</td>';
                    htm+='<td>';
                      htm+=msg.liste[e].idx;
                    htm+='</td>';
                    htm+='<td style="display:inline-flex;">';
                      htm+='<button stidx="'+msg.liste[e].idx+'" class="btn btn-sm btn-outline-primary me-2 loaddataset_button" type="button">Load</button>';
                      htm+='&nbsp;<button stidx="'+msg.liste[e].idx+'" class="btn btn-sm btn-outline-danger me-2 deletedataset_button" type="button">Delete...</button>';
                    htm+='</td>';
                  htm+='</tr>';
                }
                manufacturers=uniqueArray2(manufacturers);


        var buttonmainhtm_start='<div class="dropdown" >';
        var buttonhtm_start='<button id="manufacturers_dropdown" class="btn btn-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">';
        var button_title='';
        var buttonhtm_end='</button>';
        var buttonlist_start='<ul class="dropdown-menu">';
        var buttonlist_end='</ul>';
        var buttonmainhtm_end='</div>';
        var buttonitems='';
        for (var t=0;t<manufacturers.length;t++){
            buttonitems+='<li><a class="dropdown-item" typedrop="manufacturerdropdown" href="#" ref="'+manufacturers[t]+'">'+manufacturers[t]+'</a></li>';
        }
        $("#manufacturerdropdiv").html(buttonmainhtm_start+buttonhtm_start+button_title+buttonhtm_end+buttonlist_start+buttonitems+buttonlist_end+buttonmainhtm_end);


                $('.dropdown-item[typedrop="manufacturerdropdown"]').unbind("click");
                $('.dropdown-item[typedrop="manufacturerdropdown"]').on("click",function(e){
                    var ref=$(this).attr("ref");
                    $('.searchinput[ref="manufacturer"]').val(ref);
                    update_db_list();
                  //alert(theseriescolumn.attr("id"));
                });


                $("#datasets_table").append(htm);
                $(".loaddataset_button").unbind("click");
                $(".loaddataset_button").on("click",function(e){
                  //load_dataset_from_file();
                  var stidx=$(this).attr("stidx");

                  load_dataset_from_db(stidx);
                  window.scrollTo(0, 0);
                });
                $(".deletedataset_button").unbind("click");
                $(".deletedataset_button").on("click",function(e){
                  //load_dataset_from_file();
                  var stidx=$(this).attr("stidx");
                  if (confirm("Do you want to delete this dataset from the DB ?") == true) {
                      delete_dataset_from_db(stidx);
                  } else {
                  }
                });

              } else {
                alert("Une erreur est survenue "+msg.error_description);
              }
            },
            error: function(xhr, ajaxOptions, thrownError) {
              alert("Error " + xhr.status + " (”" + thrownError + "”). Please contact administrator.");
              $(".infobox").hide();
            }
        });  
    }


//######################################################################
//Non utilisé/deprecated
//######################################################################
    var intervalfade=0;
    var intervalfadeo=0;

  //     function assess_series_quality(){
  //         //tester T2 post gado
  //         //
  //     }
  //     function save_dataset_to_file() {
  //       var textToSave=JSON.stringify(studies);
  //       var hiddenElement = document.createElement('a');
  //       hiddenElement.href = 'data:attachment/text,' + encodeURI(textToSave);
  //       hiddenElement.target = '_blank';
  //       hiddenElement.download = 'myFile.txt';
  //       hiddenElement.click();
  //     }
  //async function loadFile(file) {
  //  let text = await file.text();
  //  studies=JSON.parse(text);
  //  piqual_mr_assessment();
  //}
// function executeFunctionByName(functionName, context /*, args */) {
//   var args = Array.prototype.slice.call(arguments, 2);
//   var namespaces = functionName.split(".");
//   var func = namespaces.pop();
//   for(var i = 0; i < namespaces.length; i++) {
//     context = context[namespaces[i]];
//   }
//   return context[func].apply(context, args);
// }

$(document).ready(function() {
    //initialize cornerstone
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;  
    //A l'ouverture de la page, faire un reset_all pour préparer l'analyse
    reset_all();
  
    //######################################################################
    //Interface générale (onglets)
    //######################################################################
    $('.nav-link[type="tablink"]').on("click",function(e){
      $('.nav-link[type="tablink"]').removeClass("active");
      $(this).addClass("active");
      var ref=$(this).attr("ref");
      switch(ref){
        case "study_explorer":break;
        case "quality_tests":
          for (var p=0;p<mrtests.length;p++){
            var thetest=mrtests[p];
            window[thetest+"_dataset_changed"]();
          }
          break;
        case "db_explorer": update_db_list();break;
        case "support":break;
      }
      $(".maintab").hide();
      $("#"+ref).show();
    });
  
    //######################################################################
    //Interface de l'onglet DATASET
    //######################################################################
    //enregistrer l'écoute de ESC pour stopper une analyse
    $(document).keydown(function(e) {
         if (e.key === "Escape") { // escape key maps to keycode `27`
            if (files_processed>0){
              global_cancel_alert=true;
            }
        }
    });
    //être capable de recevoir les fichiers droppés dans deux zones : dragzone et status
    var elDrop = document.getElementById('dragzone');
    elDrop.addEventListener('dragover', function (event) {
        event.preventDefault();
    });
    elDrop.addEventListener('drop', function (event) {
        get_the_drop(event);
    });
    var elDrop2 = document.getElementById('status');
    elDrop2.addEventListener('dragover', function (event) {
        event.preventDefault();
    });
    elDrop2.addEventListener('drop', function (event) {
        get_the_drop(event);
    });
    $("#reset_explorer_button").on("click",function(e){
      reset_all();
    });
    $("#savedataset_button").on("click",function(e){
      //save_dataset_to_file();
      save_dataset_to_db();
    });

  

    //######################################################################
    //Interface de l'onglet DATABASE
    //######################################################################
    $("#searchtext").on("input",function(e){
      var what=$(this).val();
      $(".series").hide();
      $(".series:icontains('"+what+"')").show();
      $(".series").find("span,td").each(function( index ) {
        $(this).html($(this).html().replace('<mark>',''));
        $(this).html($(this).html().replace('</mark>',''));
        if (what!=''){
          var replaceMask = "<mark>"+what+"</mark>";
          $(this).html($(this).html().replace(what, replaceMask));
        }
      });
    });
    $(".searchline .searchinput").on("keyup",function(e){
       if ( e.which == 13 ) {
          e.preventDefault();
          var ref=$(this).attr("ref");
          var contenu=$(this).val();
         update_db_list();
         
        }
       if ( e.which == 17 ) {
             var nbdatalines=$(".dataline").length;
             if (nbdatalines==1){
               $(".dataline").first().find(".loaddataset_button").first().trigger("click");
             }
             e.stopPropagation(); // Stops some browsers from redirecting.
             e.preventDefault();
       } else {
       }
    });
    $("#clear_search").on("click",function(e){
        $(".searchinput").val("");
        update_db_list();
    });
    $('.dropdown-item[typedrop="testdropdown"]').on("click",function(e){
        var itemlabel=$(this).html();
        var bouton=$(this).closest(".dropdown").find("a");
        bouton.html(itemlabel);
        var ref=$(this).attr("ref");
        run_quality_test(ref);
      //alert(theseriescolumn.attr("id"));
    });
  

  
});
