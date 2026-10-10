//! These are real native tests but remain UNEXECUTED until Cargo is available.
use btz_native::{Cursor,Input};
use dtr_wire::{decode,hash,unhex};
use serde_json::Value;
fn replay(name:&str){
    let fixture:Value=serde_json::from_str(include_str!("../../../tests/fixtures/btz-v3-golden.json")).unwrap();
    let case=fixture["cases"].as_array().unwrap().iter().find(|c|c["name"]==name).unwrap();
    let initial=unhex(case["initial_hex"].as_str().unwrap()).unwrap();
    let inputs:Vec<Input>=decode(&unhex(case["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
    let context:Value=decode(&unhex(case["context_hex"].as_str().unwrap()).unwrap()).unwrap();
    let mut cursor=Cursor::begin(&initial,inputs,&context).unwrap();let mut count=0;
    while cursor.phase!="done"{
        cursor.step([1,7,31,127][count%4]).unwrap();count+=1;assert!(count<2_000_000);
        if count%31==0{let bytes=cursor.snapshot().unwrap();cursor=Cursor::restore(&bytes,&hash(&bytes)).unwrap();}
    }
    let result=cursor.result().unwrap();
    for(key,actual)in [("state",result.state),("events",result.events),("scores",result.scores)]{
        assert_eq!(actual,unhex(case["outputs"][key]["hex"].as_str().unwrap()).unwrap(),"{name}: {key}");
    }
}
macro_rules! case {($id:ident,$name:literal)=>{#[test]fn $id(){replay($name);}};}
case!(admission,"admission");case!(near_impact,"near-impact");case!(severance,"severance");
case!(dense,"dense");case!(duel,"duel");case!(corner,"corner");case!(wall_bounce,"wall-bounce");
