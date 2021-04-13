const map = require("./mapping.json");
const helper = {
  calculateDistance: function (lat1, lon1, lat2, lon2) {
    if (lat1 && lon1 && lat2 && lon2) {
      //Fonction tres simpa, j'aurai aimé de l'ecrire moi-meme, mais ce n'ai pas le cas :)
      const R = 6371e3; // metres
      const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const d = R * c; // in metres
      return Math.round(d);
    } else {
      return 0;
    }
  },
  getTypeParking: function (data) {
    if (data) {
      let lst = [
        { val: "GRATUIT", libelle: "Parking gratuit" },
        {
          val: "PAYANT_RESERVE_ABONNES",
          libelle: "Parking payant réservé aux abonnés",
        },
        { val: "PAYANT_TARIF_HORAIRE", libelle: "Tarif payant horaire" },
        {
          val: "PAYANT_TARIF_PARC_RELAIS",
          libelle: "Tarif payant Parc-Relais",
        },
        { val: "PAYANT_TARIF_VOIRIE", libelle: "Tarif payant voirie" },
        {
          val: "PAYANT_AUTRE_TYPE_DE_TARIF",
          libelle: "Payant autre type de tarif",
        },
      ];
      let rep = lst.find((el) => el.val === data);
      if (rep) {
        return rep.libelle;
      } else {
        return data;
      }
    }
  },
  getModelParking: function () {
    //fonction qui retourne le format de retour pour un parking:
    return {
      lon: 0,
      lat: 0,
      distance: 0,
      etat: "",
      nom: "",
      libres: 0,
      total: 0,
      info: "",
      secteur: "",
      adresse: "",
      type: "",
    };
  },
  findMapping: function (lat, lon) {
    //recherche du mapping par les coordonnées GPS du client, si il se trouve dans l'une des zones existantes dans mapping, on utilisera ces parametres pour traiter les données de l'API externe
    let result=null;
    map.mappings.forEach((element) => {
      if(lat && lon){
        if (Array.isArray(element.box) && element.box.length >= 4) {
          if (lat > element.box[0] &&  lat < element.box[2] && lon > element.box[1] && lon < element.box[3]) {
            result= element;           
          }
        } 
      } 
    });    
    if(!result){
      //aucune zone ne correspond...
      if(lat && lon) return null;//les coordonées du client existent, mais pas de correspondance...
      return map.mappings.find(element=>(element.isDefault));  //sinon pas de coordonnées, on utilisera la zone par défaut    
    } else return result;//la zone trouvé par les coordonnées GPS du client
  },
  getDataByProperty: function(data,propName){
    //fonction qui peut etre recurcive, par exemple 'properties.nom'->on recherche d'abord le champ 'properties' puis le champ 'nom'
    // on recherche les données par le nom de la proprieté (données originales de l'API externe) 
    if(propName.includes(".")){
      let tabProps=propName.split(".");
      if(data.hasOwnProperty(tabProps[0])){
        return this.getDataByProperty(data[tabProps[0]], tabProps.slice(1).join("."));
      }else{
        return null;
      }      
    }else {
      if(propName.includes("[")){
        //c'est un indice de tableau...
        const tabProps=propName.split("[");
        const arrPropName=tabProps[0];
        if(data.hasOwnProperty(arrPropName) && Array.isArray(data[arrPropName])){
          let idx=-1;
          let dataDecoupe=tabProps[1].split("]");
          idx=parseInt(dataDecoupe[0]);
          let arrData=data[arrPropName]
          return arrData[idx];
        }
      } else {
        //sinon c'est une simple proprieté
        if(data.hasOwnProperty(propName)){
          return data[propName];
        }
      }
    }
  },
  setDataProperty: function(objToSet,data, mappingPropName, mapping){
    let propName=mapping[mappingPropName];
    let dataFromProperty=this.getDataByProperty(data,propName);
    if(dataFromProperty){
      objToSet[mappingPropName]=dataFromProperty;
      return true;
    }  else return false;
  }
};
module.exports = helper;
