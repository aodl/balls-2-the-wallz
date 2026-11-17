//! Independent exact-arithmetic checkpoint. Not installed-game qualification.
use dtr_wire::Rat;
use num_bigint::BigInt;
use serde_json::{json, Value};
use std::io::Read;
#[path = "../src/deflector_boundary.rs"]
mod boundary;
use b2z_native::world::Ball;
use boundary::Trajectory;
use dtr_wire::Int;
fn fraction(v: &Value) -> Rat {
    let p: Vec<_> = v.as_str().unwrap().split('/').collect();
    Rat::new(
        p[0].parse::<BigInt>().unwrap(),
        p.get(1).unwrap_or(&"1").parse().unwrap(),
    )
    .unwrap()
}
fn text(r: &Rat) -> String {
    if r.0.denom() == &BigInt::from(1) {
        r.0.numer().to_string()
    } else {
        format!("{}/{}", r.0.numer(), r.0.denom())
    }
}
fn contact(row: &Value) -> Value {
    let i = &row["incoming"];
    let a = [fraction(&i["x0"]), fraction(&i["y0"])];
    let v = [i["vx"].as_i64().unwrap(), i["vy"].as_i64().unwrap()];
    let axis = usize::from(!matches!(row["face"].as_str().unwrap(), "E" | "W"));
    let t = Rat::new(
        (BigInt::from(row["wall"].as_i64().unwrap()) * a[axis].0.denom()) - a[axis].0.numer(),
        a[axis].0.denom() * v[axis],
    )
    .unwrap();
    let d = 22627i64;
    let arrow = match row["orientation"].as_str().unwrap() {
        "NE" => [d, -d],
        "SE" => [d, d],
        "SW" => [-d, d],
        "NW" => [-d, -d],
        _ => panic!("orientation"),
    };
    let n = match row["face"].as_str().unwrap() {
        "N" => [0, -1],
        "E" => [1, 0],
        "S" => [0, 1],
        "W" => [-1, 0],
        _ => panic!("face"),
    };
    let front = arrow[0] * n[0] + arrow[1] * n[1] > 0;
    let out = if front { arrow } else { [-arrow[0], -arrow[1]] };
    let point: Vec<_> = (0..2)
        .map(|k| a[k].add(&t.mul_i(v[k]).unwrap()).unwrap())
        .collect();
    let b: Vec<_> = (0..2)
        .map(|k| point[k].sub(&t.mul_i(out[k]).unwrap()).unwrap())
        .collect();
    json!({"id":row["id"],"time":text(&t),"point":point.iter().map(text).collect::<Vec<_>>(),"front":front,"outgoing":out,"intercept":b.iter().map(text).collect::<Vec<_>>()})
}
fn chain(row: &Value) -> Value {
    let t = row["start"].as_str().unwrap().parse::<BigInt>().unwrap();
    let (vx, vy) = b2z_mechanics::heading(row["heading"].as_u64().unwrap() as u16, 32000).unwrap();
    let mut b = Trajectory::new(
        BigInt::from(1536) - BigInt::from(vx) * &t,
        BigInt::from(1536) - BigInt::from(vy) * &t,
        1.into(),
        vx,
        vy,
    )
    .unwrap();
    let mut now = Rat::new(t, 1.into()).unwrap();
    let mut bound = None;
    let mut max_den = 1;
    let mut max_bits = 0;
    let mut max_time_bits = 0;
    let mut samples = Vec::new();
    let count = row["count"].as_u64().unwrap();
    for n in 0..count {
        let ball = Ball {
            den: None,
            deflector_rearm: None,
            id: 1,
            owner: 1,
            cell: 1001,
            x0: Int(b.x.clone()),
            y0: Int(b.y.clone()),
            vx: b.vx,
            vy: b.vy,
        };
        let c = b2z_native::geometry::next_crossing_rational(&ball, 1000, &now, b.den).unwrap();
        assert!(c.time > now);
        let old = b.clone();
        if c.x && c.y {
            b = b.reflect(0, c.xwall).unwrap().reflect(1, c.ywall).unwrap();
        } else if n != 0 && n % 7 == 0 {
            b = b
                .reflect(usize::from(!c.x), if c.x { c.xwall } else { c.ywall })
                .unwrap();
        } else {
            let face = if c.x {
                if b.vx > 0 {
                    "W"
                } else {
                    "E"
                }
            } else if b.vy > 0 {
                "N"
            } else {
                "S"
            };
            let (_, x, y) =
                boundary::face_velocity(["NE", "NW", "SW", "SE"][(n as usize * 17) % 4], face)
                    .unwrap();
            b = b.redirect(&c.time, x, y).unwrap();
            if bound.is_none() {
                bound = Some(b.den);
            }
        }
        assert_eq!(old.position(&c.time).unwrap(), b.position(&c.time).unwrap());
        if let Some(d) = bound {
            assert_eq!(d % b.den, 0);
        }
        if n % 11 == 0 {
            assert_eq!(
                b.translate(1024000, -1024000)
                    .unwrap()
                    .translate(-1024000, 1024000)
                    .unwrap(),
                b
            );
        }
        now = c.time;
        max_den = max_den.max(b.den);
        max_bits = max_bits.max(b.x.bits()).max(b.y.bits());
        max_time_bits = max_time_bits
            .max(now.0.numer().bits())
            .max(now.0.denom().bits());
        if n % 1000 == 0 || n == count - 1 {
            samples.push(json!({"n":n,"x":b.x.to_string(),"y":b.y.to_string(),"den":b.den.to_string(),"vx":b.vx,"vy":b.vy,"time":[now.0.numer().to_string(),now.0.denom().to_string()]}));
        }
    }
    json!({"id":row["id"],"max_den":max_den.to_string(),"max_numerator_bits":max_bits,"max_time_bits":max_time_bits,"samples":samples})
}
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let input: Value = serde_json::from_str(&s).unwrap();
    let result = if let Some(rows) = input["chains"].as_array() {
        rows.iter().map(chain).collect()
    } else {
        input["vectors"]
            .as_array()
            .unwrap()
            .iter()
            .map(contact)
            .collect()
    };
    println!("{}", Value::Array(result));
}
