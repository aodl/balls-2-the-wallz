//! Exact four-direction trajectory algebra used by the successor cursor.
//! World/source admission is independently versioned and validated.
use dtr_wire::{Rat, Result};
use num_bigint::BigInt;
use num_traits::{Signed, ToPrimitive, Zero};
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Trajectory {
    pub x: BigInt,
    pub y: BigInt,
    pub den: u32,
    pub vx: i32,
    pub vy: i32,
}
fn gcd(mut a: BigInt, mut b: BigInt) -> BigInt {
    a = a.abs();
    b = b.abs();
    while !b.is_zero() {
        let r = &a % &b;
        a = b;
        b = r;
    }
    a
}
impl Trajectory {
    pub fn new(x: BigInt, y: BigInt, den: BigInt, vx: i32, vy: i32) -> Result<Self> {
        if den <= BigInt::from(0)
            || vx.unsigned_abs() > 65536
            || vy.unsigned_abs() > 65536
            || (vx == 0 && vy == 0)
        {
            return Err("trajectory bounds".into());
        }
        let g = gcd(gcd(x.clone(), y.clone()), den.clone());
        let d = (&den / &g).to_u32().ok_or("denominator capacity")?;
        if d > 65536 {
            return Err("denominator capacity".into());
        }
        let x = x / &g;
        let y = y / &g;
        let limit = BigInt::from(6553600000000000000u64);
        if x.abs() > limit || y.abs() > limit {
            return Err("trajectory numerator capacity".into());
        }
        Ok(Self {
            x,
            y,
            den: d,
            vx,
            vy,
        })
    }
    pub fn position(&self, t: &Rat) -> Result<[Rat; 2]> {
        Ok([
            Rat::new(self.x.clone(), self.den.into())?.add(&t.mul_i(self.vx.into())?)?,
            Rat::new(self.y.clone(), self.den.into())?.add(&t.mul_i(self.vy.into())?)?,
        ])
    }
    pub fn redirect(&self, t: &Rat, vx: i32, vy: i32) -> Result<Self> {
        let p = self.position(t)?;
        let x = p[0].sub(&t.mul_i(vx.into())?)?;
        let y = p[1].sub(&t.mul_i(vy.into())?)?;
        let d = x.0.denom() / gcd(x.0.denom().clone(), y.0.denom().clone()) * y.0.denom();
        Self::new(
            x.0.numer() * (&d / x.0.denom()),
            y.0.numer() * (&d / y.0.denom()),
            d,
            vx,
            vy,
        )
    }
    pub fn reflect(&self, axis: usize, wall: i64) -> Result<Self> {
        if wall.unsigned_abs() > 1024000000 {
            return Err("wall bounds".into());
        }
        match axis {
            0 => Self::new(
                BigInt::from(2 * wall) * self.den - &self.x,
                self.y.clone(),
                self.den.into(),
                -self.vx,
                self.vy,
            ),
            1 => Self::new(
                self.x.clone(),
                BigInt::from(2 * wall) * self.den - &self.y,
                self.den.into(),
                self.vx,
                -self.vy,
            ),
            _ => Err("axis".into()),
        }
    }
    pub fn translate(&self, x: i64, y: i64) -> Result<Self> {
        Self::new(
            &self.x + BigInt::from(x) * self.den,
            &self.y + BigInt::from(y) * self.den,
            self.den.into(),
            self.vx,
            self.vy,
        )
    }
}
pub fn face_velocity(orientation: &str, face: &str) -> Result<(bool, i32, i32)> {
    let angle = match orientation {
        "NE" => 57344,
        "SE" => 8192,
        "SW" => 24576,
        "NW" => 40960,
        _ => return Err("orientation".into()),
    };
    let (x, y) = b2z_mechanics::heading(angle, 32000).map_err(|_| "heading")?;
    let (nx, ny) = match face {
        "N" => (0, -1),
        "E" => (1, 0),
        "S" => (0, 1),
        "W" => (-1, 0),
        _ => return Err("face".into()),
    };
    let f = x * nx + y * ny > 0;
    Ok((f, if f { x } else { -x }, if f { y } else { -y }))
}
