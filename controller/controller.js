var mysql = require('mysql2');
var axios = require('axios');
const multer = require('multer');
const bcrypt = require('bcrypt');
const Connection = require('mysql/lib/Connection');
const { response } = require('express');
const res = require('express/lib/response');
const { Console } = require('console');


var pool = mysql.createPool({
    connectionLimit: 10000,
    host: 'db-mysql-blr1-53805-do-user-14655086-0.b.db.ondigitalocean.com',
    port: 25060,
    user: 'doadmin',
    password: 'AVNS_IyS3LDFUOD7aRe8XpEG',
    database: 'refrals',
    multipleStatements: true

});

pool.getConnection(function (err, connection) {
    if (err) {
        console.log(err)
        return;
    }
});


//user network graph
const getUserNetwork = async (req, res, next) => {
    var userId = req.body.userId;
    let response;
    pool.getConnection(async function (err, connection) {
        if (err) {
            console.log("<<<Connection Error>>>>", err);
        } else {
            try {
                const query = "SELECT CONCAT(REPEAT(' ',level - 1),hi.name) AS name, hierarchy_sys_connect_by_path('/',hi.id) AS path, parent_id,hi.id as memberId , level FROM ( SELECT hierarchy_connect_by_parent_eq_prior_id_with_level(id,10) AS id, CAST(@level AS SIGNED) AS level FROM ( SELECT @start_with := " + userId + ", @id := @start_with, @level := 0 ) vars, user_referral WHERE @id IS NOT NULL ) ho JOIN user_referral hi ON hi.id = ho.id ORDER BY path";

                connection.query(query, async function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": err };
                    } else {
                        let currentuse = {
                            "memberId": userId,
                            "name": "Me",
                            "parent_id": null,
                            "tree": null
                        }
                        result.push(currentuse);
                        response = { "status": true, "message": "Success", "data": result };
                    }
                    res.json(response);
                });
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }
        }
    });
}
//for distribute amount among nodes

const getdirectRefral = async (req, res, next) => {
    let response;
    const userId = req.body.userId;
    const amount = req.body.amount;
    const blocknumber = req.body.block;
    const weight = req.body.weight;
    pool.getConnection(function (err, connection) {
        if (err) {
            response = { "status": false, "message": "Error fetching data" };
        } else {
            try {
                // connection.connect(function (err) {
                //const query = "SELECT CONCAT(REPEAT(' ',level - 1),hi.name) AS name, hierarchy_sys_connect_by_path('/',hi.id) AS path, parent_id,hi.id as memberId , level FROM ( SELECT hierarchy_connect_by_parent_eq_prior_id_with_level(id,10) AS id, CAST(@level AS SIGNED) AS level FROM ( SELECT @start_with := 1, @id := @start_with, @level := 0 ) vars, user_referral WHERE @id IS NOT NULL ) ho JOIN user_referral hi ON hi.id = ho.id WHERE ho.id=" + userId + " ORDER BY path";
                const q = "SELECT id,name,parent_id FROM (SELECT id,name,parent_id,CASE WHEN id = " + userId + " THEN @idlist := CONCAT(IFNULL(@idlist,''),',',parent_id)WHEN FIND_IN_SET(id,@idlist) THEN @idlist := CONCAT(@idlist,',',parent_id) END as checkId FROM user_referral ORDER BY id DESC)T WHERE checkId IS NOT NULL limit 10"
                connection.query(q, function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": "Error fetching data" };
                    } else {
                        var coin = 5;
                        result.forEach(function (e, i) {
                            let parentId = e.parent_id;
                            let CLevel = i + 1;
                            if (i > 4) {
                                coin++;
                                let da = (amount * coin) / 100;
                                var records = [[userId, parentId, da, CLevel, blocknumber, coin, amount]];
                                connection.query("INSERT INTO reward_distribut (user_id, parent_id, reward, level, block, weight, total) VALUES ?", [records], async function (err, result, fields) {
                                    if (err) throw err;
                                    connection.query("SELECT * FROM `user_reward` WHERE user_id=" + parentId + "", async function (err, result, fields) {
                                        if (err) throw err;
                                        if (result && result.length > 0) {
                                            let ureward = result[0].reward + da;
                                            console.log("result", ureward);
                                            connection.query("UPDATE `user_reward` SET `reward`=" + ureward + " WHERE user_id=" + parentId + "", async function (err, result, fields) {
                                                if (err) throw err;
                                            })

                                        } else {
                                            let ureward = [[parentId, da]];
                                            connection.query("INSERT INTO user_reward (user_id, reward) VALUES ?", [ureward], async function (err, result, fields) {
                                                if (err) throw err;
                                            })
                                        }

                                    });

                                });
                                response = { "status": true, "message": "Reward Distributed successfully. " };
                            } else {
                                let da = (amount * coin) / 100;
                                var records = [[userId, parentId, da, CLevel, blocknumber, coin, amount]];

                                connection.query("INSERT INTO reward_distribut(user_id, parent_id, reward, level, block, weight, total) VALUES ?", [records], async function (err, result, fields) {
                                    if (err) throw err;
                                    connection.query("SELECT * FROM `user_reward` WHERE user_id=" + parentId + "", async function (err, result, fields) {
                                        if (err) throw err;
                                        if (result && result.length > 0) {
                                            let ureward = result[0].reward + da;
                                            connection.query("UPDATE `user_reward` SET `reward`=" + ureward + " WHERE user_id=" + parentId + "", async function (err, result, fields) {
                                                if (err) throw err;
                                            })

                                        } else {
                                            let ureward = [[parentId, da]];
                                            connection.query("INSERT INTO user_reward (user_id, reward) VALUES ?", [ureward], async function (err, result, fields) {
                                                if (err) throw err;
                                            })
                                        }

                                    });

                                });
                                coin--;
                                response = { "status": true, "message": "Reward Distributed successfully. " };
                            }

                        });

                        // connection.release();
                        res.json(response);
                    }

                });
                // });
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }
        }
    });
}
//add referral 
const addrefreal = async (req, res, next) => {
    let referrer = req.body.referrer;
    let child = req.body.child;
    let name = req.body.name;
    let email = req.body.email;
    let response;
    pool.getConnection(async function (err, connection) {
        if (err) {
            response = { "status": false, "message": "Error fetching data" };
        } else {
            try {
                if (referrer != "" && referrer != null) {
                    connection.query("SELECT * FROM `user_referral` WHERE id=" + child + "", async function (err, result, fields) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (result?.length === 0) {
                                let parent = referrer;
                                if (child != parent) {
                                    var records = [[child, name, email, parent]];
                                    connection.query("INSERT INTO user_referral (id, name, email, parent_id) VALUES ?", [records], async function (err, result, fields) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            let cid = await getusersParentById(child, connection).then((res) => {
                                                return res;
                                            });
                                            response = { "status": true };
                                            res.json(response);
                                        }
                                    });
                                } else {
                                    response = { "status": true, "message": "Parent and child Id can't be the same!" };
                                    res.json(response);
                                }
                            } else {
                                response = { "status": true, "message": "User allready exiest !" };
                                res.json(response);
                            }
                        }
                    });
                }
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }
        }
    });

}




const addrefreal1 = async (req, res, next) => {
    let referrer = req.body.referrer;
    let child = req.body.child;
    let name = req.body.name;
    let email = req.body.email;
    let response;
    pool.getConnection(async function (err, connection) {
        if (err) {
            response = { "status": false, "message": "Error fetching data" };
        } else {
            try {
                if (referrer != "" && referrer != null) {
                    connection.query("SELECT * FROM `user_referral1` WHERE id=" + child + "", async function (err, result, fields) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (result?.length === 0) {
                                let parent = referrer;
                                if (child != parent) {
                                    var records = [[child, name, email, parent]];
                                    connection.query("INSERT INTO user_referral1 (id, name, email, parent_id) VALUES ?", [records], async function (err, result, fields) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            let cid = await getusersParentById1(child, connection).then((res) => {
                                                return res;
                                            });
                                            response = { "status": true };
                                            res.json(response);
                                        }
                                    });
                                } else {
                                    response = { "status": true, "message": "Parent and child Id can't be the same!" };
                                    res.json(response);
                                }
                            } else {
                                response = { "status": true, "message": "User allready exiest !" };
                                res.json(response);
                            }
                        }
                    });
                }
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }
        }
    });

}








const getUserNetworkwithamount = async (req, res, next) => {
    var userId = req.body.userId;
    let response;
    pool.getConnection(async function (err, connection) {
        if(err){
            console.log("<<<<Connection Error>>>",err);
        }else{
            try{
        const query = "SELECT CONCAT(REPEAT(' ',level - 1),hi.name) AS name, hierarchy_sys_connect_by_path('/',hi.id) AS path,(SELECT SUM(reward)  FROM reward_distribut WHERE user_id=hi.id AND parent_id='" + userId + "') AS RAmount, parent_id,hi.id as memberId , level FROM ( SELECT hierarchy_connect_by_parent_eq_prior_id_with_level(id,10) AS id, CAST(@level AS SIGNED) AS level FROM ( SELECT @start_with := " + userId + ", @id := @start_with, @level := 0 ) vars, user_referral WHERE @id IS NOT NULL ) ho JOIN user_referral hi ON hi.id = ho.id ORDER BY path";

        connection.query(query, async function (err, result, fields) {
            if (err) {
                response = { "status": false, "message": err };
            } else {
                let currentuse = {
                    "memberId": userId,
                    "name": "Me",
                    "parent_id": null,
                    "tree": null
                }
                result.push(currentuse);
                response = { "status": true, "message": "Success", "data": result };
            }
            res.json(response);
        });
    } catch (err) {
        console.log(err)
    } finally {
        connection.release()

    }
    }
    });
}

const getTotalAffiliatesReward = async (req, res, next) => {
    pool.getConnection(function (err, connection) {
        connection.query('SELECT sum(reward) as totalamount FROM user_reward', function (err, result, fields) {
            if (err) {
                var response = { "status": false, "message": err };
                res.json(response);

            } else {
connection.release()
               var  response = { "status": true, "message": "Success", "data": result };
               res.json(response);
            }
        });
    });
}

const getUserRefralAmount = async (req, res, next) => {
    var userid = req.body.userId;
    let response;
    let data = {};
    pool.getConnection(async function (err, connection) {
        connection.query(`SELECT sum(reward) as totalReward FROM reward_distribut WHERE  parent_id =${userid}`, async function (err, result, fields) {
            if (err) {
                response = { "status": false, "message": "Error fetching data" };
            } else {
                data.totalReward = result[0].totalReward;
                connection.query(`SELECT total FROM reward_distribut WHERE  parent_id =${userid} GROUP BY block`, async function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": "Error fetching data" };
                    } else {
                        let amount = 00;
                        result.forEach(element => {
                            amount = amount + parseFloat(element.total);
                        });
                        data.totalbalance = amount;
                    }
                });

            }
            setTimeout(() => {
                let r = [];
                r.push(data);
                response = { "status": true, "message": "Success", "data": r };
                res.json(response);
            }, 1000);

        });
    });
}
const getRefralHistory = async (req, res, next) => {
    var userId = req.body.userId;
    var response;
    pool.getConnection(function (err, connection) {
        if (err) {
            console.log("<<<Connection Error>>>", err);
        } else {
            try {
                const query = "select * from reward_distribut WHERE parent_id= " + userId + " ORDER BY id DESC";
                connection.query(query, function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": err };
                    } else {
                        response = { "status": true, "message": "Success", "data": result };
                    }
                    res.json(response);
                });
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }
        }

    });
}




const getRefralInformation = async (req, res, next) => {
    var userId = req.body.userId;
    let response;

    pool.getConnection(async function (err, connection) {
        if (err) {
            console.log("connectionError", err);
        } else {
            try {
                // console.log("hellofdjkdfjk"); 
                const qu = "SELECT  hi.id as totalmember  FROM ( SELECT hierarchy_connect_by_parent_eq_prior_id_with_level(id,10) AS id, CAST(@level AS SIGNED) AS level FROM ( SELECT @start_with :=" + userId + ", @id := @start_with, @level := 0 ) vars, user_referral WHERE @id IS NOT NULL ) ho JOIN user_referral hi ON hi.id = ho.id";
                
 		    connection.query(qu, async function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": err };
                    } else {

                        let totalrefral = result.length;
                        // let refralsid = [];
                        // result.forEach((element) => {
                        //     refralsid.push(element.totalmember);

                        // });
                        //let allids = (refralsid && refralsid.length > 0) ? refralsid : 0;

                        // const q =
                        //"SELECT SUM(reward) AS totalAfliyatreward  FROM `reward_distribut` WHERE user_id IN (" + allids + ") AND parent_id=" + userId + "";
                        const q = "SELECT reward as totalAfliyatreward FROM `user_reward` WHERE user_id=" + userId + "";
                        console.log("helloghdsfvhjdsfhjdfsh", q);
                        connection.query(q, async function (err, result, fields) {
                            if (err) {
                                console.log("helll", err);
                                response = { "status": false, "message": err };

                            } else {
                                let data = {};
                                data.totalMembers = totalrefral;
                                console.log("hello", result);
                                data.totalrefralamount = (result && result.length > 0) ? result[0].totalAfliyatreward : 00;
                                // const sql2="SELECT SUM(reward) AS total,IFNULL((SELECT COUNT(id) FROM user_referral WHERE parent_id="+userId+"),0) AS totaldirRefral  FROM reward_distribut WHERE parent_id IN (SELECT id FROM user_referral WHERE parent_id="+userId+")";
                                const sql2 = "SELECT COUNT(id) As totaldirRefral  FROM user_referral WHERE parent_id=" + userId + "";

                                connection.query(sql2, async function (err, result, fields) {
                                    if (err) {
                                        response = { "status": false, "message": err };
                                    } else {
                                        data.dirRefralMembers = (result[0].totaldirRefral) ? result[0].totaldirRefral : 00;
                                        response = { "status": true, "message": "Success", "data": data };
                                        res.json(response);

                                    }
                                })

                            }

                        });
                    }
                });
            } catch (err) {
                console.log(err)
            } finally {
                connection.release()

            }

        }
    });
}






const mergeRecordToothertable = async (req, res, next) => {

    let response;
    pool.getConnection(async function (err, connection) {
        if (err) {
            console.log("connectionError", err);
        } else {
            const sel = "SELECT * FROM `user_referral` GROUP BY parent_id  ORDER BY parent_id ";
            connection.query(sel, async function (err, result, fields) {
                if (err) {
                    console.log("error", err);
                } else {
                    if (result && result.length > 0) {
                        console.log("hellofvjkfdj", result);
                        result.forEach((element) => {
                            const qu = "SELECT  hi.id as totalmember  FROM ( SELECT hierarchy_connect_by_parent_eq_prior_id_with_level(id,10) AS id, CAST(@level AS SIGNED) AS level FROM ( SELECT @start_with :=" + element.parent_id + ", @id := @start_with, @level := 0 ) vars, user_referral WHERE @id IS NOT NULL ) ho JOIN user_referral hi ON hi.id = ho.id";
                            connection.query(qu, async function (err, result, fields) {
                                if (err) {
                                    response = { "status": false, "message": err };
                                } else {

                                    let refralsid = [];
                                    result.forEach((element) => {
                                        refralsid.push(element.totalmember);

                                    });


                                    const q =
                                        "SELECT SUM(reward) AS totalAfliyatreward  FROM `reward_distribut` WHERE user_id IN (" + refralsid + ") AND parent_id=" + element.parent_id + "";


                                    connection.query(q, async function (err, result, fields) {
                                        if (err) {
                                            console.log("helll", err);
                                            response = { "status": false, "message": err };

                                        } else {
                                            let da = (result && result[0].totalAfliyatreward != null) ? result[0].totalAfliyatreward : 00;
                                            connection.query("SELECT * FROM `user_reward` WHERE user_id=" + element.parent_id + "", async function (err, result, fields) {
                                                if (err) throw err;
                                                if (result && result.length > 0) {
                                                    let ureward = result[0].reward + da;
                                                    connection.query("UPDATE `user_reward` SET `reward`=" + ureward + " WHERE user_id=" + element.parent_id + "", async function (err, result, fields) {
                                                        if (err) throw err;
                                                    })

                                                } else {
                                                    let ureward = [[element.parent_id, da]];
                                                    connection.query("INSERT INTO user_reward (user_id, reward) VALUES ?", [ureward], async function (err, result, fields) {
                                                        if (err) throw err;
                                                    })
                                                }

                                            });
                                        }

                                    });
                                }
                            })
                        });
                        response = { "status": true, "message": "Success" };
                        res.json(response);

                    }
                }
            })


        }
    });
}

// get users all parent 
async function getusersParentById(userId, connection) {
    return new Promise(async (resolve, reject) => {
        let response;
        let q = "SELECT id,name,parent_id FROM (SELECT id,name,parent_id,CASE WHEN id = " + userId + " THEN @idlist := CONCAT(IFNULL(@idlist,''),',',parent_id)WHEN FIND_IN_SET(id,@idlist) THEN @idlist := CONCAT(@idlist,',',parent_id) END as checkId FROM user_referral ORDER BY id DESC)T WHERE checkId IS NOT NULL limit 10"
        connection.query(q, async function (err, result, fields) {
            if (err) {
                console.log(err);
            } else {
                if (result && result?.length > 0) {
                    let refralsid = [];
                    result.forEach((element) => {
                        refralsid.push(element.parent_id);
                    });
                    connection.query("SELECT * FROM user_parent Where user_id =" + userId + "", async function (err, result, fields) {
                        if (result.length === 0) {
                            let parentsId = refralsid.toString();
                            var records = [[userId, parentsId]];
                            connection.query("INSERT INTO user_parent (user_id, parents_id) VALUES ?", [records], async function (err, result, fields) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    response = { "status": true };
                                    return resolve(response);
                                }
                            });
                        } else {
                            response = { "status": false, "msg": "Users allready exiest!" };
                            return resolve(response);
                        }

                    });
                } else {
                    response = { "status": true, "message": "Parent Id not found!" };
                    return resolve(response);
                }

            }

        });


    });

}





async function getusersParentById1(userId, connection) {
    return new Promise(async (resolve, reject) => {
        let response;
       	let q="SELECT id,name,parent_id FROM (SELECT id,name,parent_id, CASE WHEN id = " + userId + " THEN @id := parent_id WHEN id = @id THEN @id := parent_id END as checkId FROM user_referral1 ORDER BY id DESC) as T WHERE checkId IS NOT NULL limit 10";        
	connection.query(q, async function (err, result, fields) {
            if (err) {
                console.log(err);
            } else {
                if (result && result?.length > 0) {
                    let refralsid = [];
                    result.forEach((element) => {
                        refralsid.push(element.parent_id);
                    });
                    connection.query("SELECT * FROM user_parent1 Where user_id =" + userId + "", async function (err, result, fields) {
                        if (result.length === 0) {
                            let parentsId = refralsid.toString();
                            var records = [[userId, parentsId]];
                            connection.query("INSERT INTO user_parent1 (user_id, parents_id) VALUES ?", [records], async function (err, result, fields) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    response = { "status": true };
                                    return resolve(response);
                                }
                            });
                        } else {
                            response = { "status": false, "msg": "Users allready exiest!" };
                            return resolve(response);
                        }

                    });
                } else {
                    response = { "status": true, "message": "Parent Id not found!" };
                    return resolve(response);
                }

            }

        });


    });

}





const gerLevalAmount = async (req, res, next) => {
    let response;
    const leval = req.body.leval;
    const user_id = req.body.userId;
    pool.getConnection(function (err, connection) {
        if (err) {
            response = { "status": false, "message": "Error fetching data" };
        } else {
            try {
                let q = "SELECT sum(reward) as total  FROM reward_distribut where parent_id=" + user_id + " AND level=" + leval + "";
                connection.query(q, function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": "Error fetching data" };
                    } else {
                        console.log("<<<<",result); 
                        if (result && result.length > 0) {
                            res.json(result);
                        }

                    }
                });
            } catch (err) {
                console.log(err)
             } finally {
                connection.release();
            }
        }
    })
}


const getUserdirectRefral =async (req,res,next)=>{
    let response;
    let userId = req.body.userId; 
    pool.getConnection(function (err, connection) {
        if (err) {
            response = { "status": false, "message": "Error fetching data" };
        } else {
            try {
                const q = "SELECT * FROM user_referral where parent_id=" + userId + "";
                connection.query(q, function (err, result, fields) {
                    if (err) {
                        response = { "status": false, "message": "Error fetching data" };
                    } else {
                        if (result && result.length > 0) {
                            response = { "status": false, "data": result };
                            res.json(response);
                        }else{
                            response = { "status": false, "message": "Data not found. !" };
                        }
                    }

                });
            } catch (err) {
                console.log(err)
            } finally {
                connection.release();
            }
        }
    });

}
module.exports = {
    addrefreal,
    addrefreal1,	
    getUserNetwork,
    getdirectRefral,
    getUserNetworkwithamount,
    getUserRefralAmount,
    getRefralHistory,
    getRefralInformation,
    mergeRecordToothertable,
    gerLevalAmount,
    getUserdirectRefral,
    getTotalAffiliatesReward

}