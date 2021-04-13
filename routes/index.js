var express = require('express');
var router = express.Router();

const indexCtrl = require("../controllers/indexCtrl");

/* GET */
router.get('/', indexCtrl.getData);

module.exports = router;