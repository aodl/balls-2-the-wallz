import {Principal} from '@icp-sdk/core/principal';

/** Keep an explicitly declared ICRC account. A declaration grants no authority. */
export function explicitFunding(account) {
 if(!account?.owner||Principal.fromText(account.owner).toText()!==account.owner)throw Error('FUNDING_OWNER_REQUIRED');
 const subaccount=account.subaccount??'00'.repeat(32);
 if(!/^[a-f0-9]{64}$/.test(subaccount))throw Error('FUNDING_SUBACCOUNT');
 return {owner:account.owner,subaccount};
}
