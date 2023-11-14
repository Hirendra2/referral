const express = require('express');
const router  = express.Router();
const controller = require('../controller/controller');
router.post('/getdirectRefral',controller.getdirectRefral);
router.post('/getUsersDirectRefral',controller.getUserdirectRefral); 
router.post('/getUserNetwork',controller.getUserNetwork);
router.post('/addrefreal',controller.addrefreal);
router.post('/getUserNetworkwithamount',controller.getUserNetworkwithamount);
router.post('/getUserRefralAmount',controller.getUserRefralAmount); 
router.post('/getRefralHistory',controller.getRefralHistory); 
router.post('/getRefralInformation',controller.getRefralInformation); 
router.get("/mergeRecordToothertable",controller.mergeRecordToothertable); 
router.post('/getRewardUserid',controller.gerLevalAmount);
router.post('/addrefreal1',controller.addrefreal1);
router.get('/getTotalAffiliatesReward',controller.getTotalAffiliatesReward);

module.exports = router;