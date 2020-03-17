const _ = require('underscore');
const NEEDSYNCATTRIBUTES = ['name', 'username', 'email', 'email_verified', 'mobile', 
'mobile_verified', 'locale', 'avatar', 'last_logon', 'email_notification', 'sms_notification'];

getNeedSyncSet = function(doc, modifierSet){
    let syncSet = {};
    _.each(NEEDSYNCATTRIBUTES, function(key){
        if(_.has(modifierSet, key) && doc[key] != modifierSet[key]){
            syncSet[key] = modifierSet[key]
        }
    })
    return syncSet;
}

getNeedSyncUnSet = function(doc, modifierUnset){
    let syncUnset = {};
    _.each(NEEDSYNCATTRIBUTES, function(key){
        if(_.has(modifierUnset, key)){
            syncUnset[key] = 1
        }
    })
    return _.isEmpty(syncUnset) ? undefined: syncUnset;
}

//当space_users的特定属性[:NEEDSYNCATTRIBUTES]变化时，同步到users、非当前space_users
exports.syncUserInfo = function (doc, modifier) {
    let modifierSet = modifier.$set || {};
    let modifierUnset = modifier.$unset || {};
    let needSyncProp = getNeedSyncSet(doc, modifierSet);
    let needSyncUnProp = getNeedSyncUnSet(doc, modifierUnset);
    if(!_.isEmpty(needSyncProp)){
        let userProp = {};
        let userUnProp = {};
        
        if(needSyncProp.email){
			needSyncProp.email_verified = false
        }

		if(needSyncProp.mobile){
			needSyncProp.mobile_verified = false
        }

        if(_.has(needSyncProp, 'email') && !needSyncProp.email){
            needSyncProp.email_verified = false
            userUnProp = Object.assign({emails: 1}, needSyncUnProp)
        }else{
            userUnProp = needSyncUnProp
        }
        
        if(needSyncProp.email){
            userProp = Object.assign({steedos_id: needSyncProp.email, emails: [{
                address: needSyncProp.email,
                verified: false
            }]}, needSyncProp)
        }else{
            userProp = needSyncProp
        }
        db.users.direct.update({_id: doc.user}, {$set: userProp, $unset: userUnProp});
        db.space_users.direct.update({_id: {$ne: doc._id}, user: doc.user}, {$set: needSyncProp, $unset: needSyncUnProp}, {
            multi: true
        });
    }
}

exports.pickNeedSyncProp = function(doc){
    return _.pick(doc, NEEDSYNCATTRIBUTES);
}