const fetch = require("node-fetch");
const helper = require("../helper");

const controller = {

  getData: async (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;

    //on va recherche le mapping en fonction des coordonnées(lat et lon) du client, 
    //ou si pas de coordonnées envoyés, on utiliser le mapping par défaut
    // Malheuresement, je n'ai pas trouvé comment transformer proprement la reponse au format XML vers json, j'ai donc utilisé une autre URL que j'ai trouvé sur le site de Bordeaux
    let objMapping = await getApi(lon, lat);
    let url = objMapping?.url;
   
    if(url){
        var myInit = { method: "GET" };    
        try {
          const responsePromise = await fetch(url, myInit);
          let data = await responsePromise.json();//données envoyés par API externe

          let arrData=helper.getDataByProperty(data, objMapping.dataArray); //le tableau de données extrait de la reponse selon le fichier de mappage
        
          if (arrData?.length) {
            let result = [];
            for (let index = 0; index < arrData.length; index++) {
              const element = await getParkingData( lon, lat, arrData[index], objMapping.dataElement ); //on traite chaque parking dans cette fonction 
              if (element) result.push(element);
            }
            if (lon && lat) {  
                //filtrage de données dans un rayon(en metres) spécifié dans le fichier .env
                //la distance est calculée à partir des coordonées GPS du client et les coordonnées du parking            
              result = result.filter((el) => el.distance <= process.env.MAX_DISTANCE_M).sort((first, second) => first.distance - second.distance);
            }
            res.json({
              success: true,
              total: result.length,
              data: result,
            });
          } else {
            res.status(500).json({
              success: false,
              message: "Une erreur s'est produite! Le format de données non pris en charge",
            });
          }
        } catch (error) {
          res.status(500).json({
            success: false,
            message: "Une erreur s'est produite! " + JSON.stringify(error),
          });
        }
    } else {
        //On n'a pas reussi à recuperer URL de l'API externe: peut etre que les coordonnées gps du client ne correspondent à aucune zone dans le fichier de mappage...
      res.status(400).json({
        success: false,
        message: "Une erreur s'est produite! " + objMapping?.msg,
      });
    }
  },
  
};

async function getApi(lon, lat) {
    //Fonction qui permet de rechercher le fichier de mappage correspondant à la zone defini par les coordonnées gps du client, au le mappage par defaut si pas de coordonnées
    const mapping=helper.findMapping(lat,lon);  
  try {
    if (mapping){
        return mapping;        
    } else if (lat && lon) {
        //Les coordonnées gps du client existent mais aucune zone dans le fichier de mappage ne correspond...
        const adresse = await getAdress(lon, lat);
        return { url: "", msg:  adresse + " - cette zone n'est pas couverte" };       
     }      
  } catch (error) {
    let objUrl = { url: "", msg: "" };
    objUrl.url = "";
    objUrl.msg = " Une erreur s'est produite lors de vérification des coordonnées";
    return objUrl;
  }
};
async function getParkingData(lon, lat, data, objMapping) {   
    //Cette fonction traite les données d'un parking
    let objParking = helper.getModelParking();
    try {              
        for (prop in objMapping) {
            let ret= helper.setDataProperty(objParking,data,prop,objMapping);
           if(!ret) console.log(`---------setDataProperty(' ${prop}') -> ${ret} pour ${data.properties?.nom}`);
        } 
        objParking.type=helper.getTypeParking(objParking.type); //le libelle plus explicite que la donnée brute...  
        if(lon && lat && objParking.lon && objParking.lat){
            //on calcule la distance du parking et le client (en metres)
            objParking.distance=helper.calculateDistance(lat, lon,objParking.lat, objParking.lon);
        }       
        return objParking;
    } catch (error) {     
        console.log("error objParking" + JSON.stringify(error));
      return null;
    }
  }

async function getAdress(lon, lat) {
    //recuperation de l'adresse par les coordonnées GPS
  let url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`;
  var myInit = { method: "GET" };
  const responsePromise = await fetch(url, myInit);
  const data = await responsePromise.json();
  try {
    if ( data.hasOwnProperty("features") && data.features.length > 0 && data.features[0].hasOwnProperty("properties") && data.features[0].properties.hasOwnProperty("label")) {
      return data.features[0].properties.label;
    } else return "";
  } catch (error) {
    console.log("err fetch " + JSON.stringify(error));
  }
}
module.exports = controller;
