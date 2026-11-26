//! Rules20 one-traversal exception for an existing Ball intersecting an
//! explicitly constructed structure. This is canonical state, not a cursor
//! hint: interruption, restart and independent replay must see the same law.
use crate::{
    geometry::next_crossing,
    world::{Ball, World},
};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Cannon,
    Deflector,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Exception {
    pub ball: u32,
    pub kind: Kind,
    pub structure: u32,
    pub cell: usize,
}

fn touches_forward(world: &World, ball: &Ball, cell: usize) -> Result<bool> {
    let crossing = next_crossing(ball, world.width, &world.time)?;
    if ball.cell == cell {
        // A Ball already leaving this tile at the exact construction instant
        // does not gain authority to pass through it on a later return.
        return Ok(crossing.time > world.time);
    }
    if crossing.time != world.time {
        return Ok(false);
    }
    let x = ball.cell % world.width;
    let y = ball.cell / world.width;
    let sx = ball.vx.signum() as i64;
    let sy = ball.vy.signum() as i64;
    let target_x = crossing
        .x
        .then(|| crate::world::wrap_cell(x as i64 + sx, y as i64, world.width, world.height));
    let target_y = crossing
        .y
        .then(|| crate::world::wrap_cell(x as i64, y as i64 + sy, world.width, world.height));
    let diagonal = (crossing.x && crossing.y)
        .then(|| crate::world::wrap_cell(x as i64 + sx, y as i64 + sy, world.width, world.height));
    // At an exact vertex the line only touches each side tile at a point.
    // Grant the side exception only if the structure-free contact law would
    // actually enter that side. Otherwise a tangency could create authority
    // for a later, unrelated encounter.
    if world.player_at(cell) != Some(ball.owner) {
        return Ok(false);
    }
    if !crossing.x || !crossing.y {
        return Ok(target_x == Some(cell) || target_y == Some(cell));
    }
    let side_x = target_x.ok_or("passage side x")?;
    let side_y = target_y.ok_or("passage side y")?;
    let diagonal = diagonal.ok_or("passage diagonal")?;
    let pass_x = side_x == cell || friendly_clear(world, ball, side_x);
    let pass_y = side_y == cell || friendly_clear(world, ball, side_y);
    if cell == diagonal {
        return Ok(pass_x && pass_y);
    }
    if cell != side_x && cell != side_y {
        return Ok(false);
    }
    if !(pass_x && pass_y) {
        return Ok(true);
    }
    if friendly_clear(world, ball, diagonal) {
        return Ok(false);
    }
    if blocked(world, ball, diagonal) {
        return Ok(false);
    }
    let parity = (x + y) & 1;
    let x_is_left = sx == sy;
    let preferred_x = (parity == 0) == x_is_left;
    Ok((cell == side_x) == preferred_x)
}

fn blocked(world: &World, ball: &Ball, cell: usize) -> bool {
    world
        .cannons
        .iter()
        .any(|c| c.cell == cell && !exempts(world, ball.id, Kind::Cannon, c.id, cell))
        || crate::deflectors_v12::at(world, cell)
            .is_some_and(|d| !exempts(world, ball.id, Kind::Deflector, d.id, cell))
}

fn friendly_clear(world: &World, ball: &Ball, cell: usize) -> bool {
    world.player_at(cell) == Some(ball.owner) && !blocked(world, ball, cell)
}

pub fn register(world: &mut World, kind: Kind, structure: u32, cell: usize) -> Result<()> {
    if world.version < 12 {
        return Ok(());
    }
    let new_rows = world
        .balls
        .iter()
        .filter_map(|ball| match touches_forward(world, ball, cell) {
            Ok(true) => Some(Ok(Exception {
                ball: ball.id,
                kind,
                structure,
                cell,
            })),
            Ok(false) => None,
            Err(error) => Some(Err(error)),
        })
        .collect::<Result<Vec<_>>>()?;
    for row in new_rows {
        if world
            .passage_exceptions
            .iter()
            .any(|old| old.ball == row.ball)
        {
            return Err("PASSAGE_EXCEPTION_CONFLICT".into());
        }
        world.passage_exceptions.push(row);
    }
    world.passage_exceptions.sort_by_key(|row| row.ball);
    Ok(())
}

pub fn exempts(world: &World, ball: u32, kind: Kind, structure: u32, cell: usize) -> bool {
    world.version >= 12
        && world
            .passage_exceptions
            .binary_search_by_key(&ball, |row| row.ball)
            .ok()
            .is_some_and(|at| {
                let row = &world.passage_exceptions[at];
                row.kind == kind && row.structure == structure && row.cell == cell
            })
}

pub fn retire_after_contact(world: &mut World, ball: u32) {
    if world.version < 12 {
        return;
    }
    if let Ok(at) = world
        .passage_exceptions
        .binary_search_by_key(&ball, |row| row.ball)
    {
        let site = world.passage_exceptions[at].cell;
        if world
            .balls
            .iter()
            .find(|b| b.id == ball)
            .is_none_or(|b| b.cell != site)
        {
            world.passage_exceptions.remove(at);
        }
    }
}

pub fn prune_removed(world: &mut World) {
    if world.version < 12 || world.passage_exceptions.is_empty() {
        return;
    }
    let rows = std::mem::take(&mut world.passage_exceptions);
    world.passage_exceptions = rows
        .into_iter()
        .filter(|row| {
            world.balls.iter().any(|b| {
                b.id == row.ball
                    && (b.cell == row.cell || touches_forward(world, b, row.cell).unwrap_or(true))
            }) && match row.kind {
                Kind::Cannon => world
                    .cannons
                    .iter()
                    .any(|c| c.id == row.structure && c.cell == row.cell),
                Kind::Deflector => world
                    .deflectors
                    .iter()
                    .flatten()
                    .any(|d| d.id == row.structure && d.cell == row.cell),
            }
        })
        .collect();
}

pub fn validate(world: &World) -> Result<()> {
    if world.version < 12 {
        return if world.passage_exceptions.is_empty() {
            Ok(())
        } else {
            Err("historical passage exception".into())
        };
    }
    if world.passage_exceptions.len() > world.balls.len() {
        return Err("passage exception bound".into());
    }
    let mut prior = 0;
    for row in &world.passage_exceptions {
        if row.ball <= prior || row.cell >= world.cell_count() {
            return Err("passage exception order".into());
        }
        prior = row.ball;
        let ball = world
            .balls
            .iter()
            .find(|b| b.id == row.ball)
            .ok_or("passage exception ball")?;
        if ball.cell != row.cell && !touches_forward(world, ball, row.cell)? {
            return Err("passage exception traversal".into());
        }
        let exists = match row.kind {
            Kind::Cannon => world
                .cannons
                .iter()
                .any(|c| c.id == row.structure && c.cell == row.cell),
            Kind::Deflector => world
                .deflectors
                .iter()
                .flatten()
                .any(|d| d.id == row.structure && d.cell == row.cell),
        };
        if !exists {
            return Err("passage exception structure".into());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::Deflector;
    use dtr_wire::{unhex, Int};

    #[test]
    fn exact_entry_passage_is_individual_durable_and_retires_after_exit() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let bytes = unhex(vector["execution"]["state"].as_str().unwrap()).unwrap();
        let mut prior = World::decode(&bytes).unwrap();
        prior.reservoirs = Some(String::new());
        let mut world =
            crate::delegation_v20::migrate(crate::reservoirs::migrate_compact(prior).unwrap())
                .unwrap();
        let b = &mut world.balls[0];
        b.cell = 500501;
        b.x0 = Int((501 * crate::world::Q).into());
        b.y0 = Int((500 * crate::world::Q + 512).into());
        b.vx = -32000;
        b.vy = 0;
        b.den = Some(Int(1.into()));
        let id = b.id;
        let structure = world.next_deflector_id.unwrap();
        *world.next_deflector_id.as_mut().unwrap() += 1;
        world.deflectors.as_mut().unwrap().push(Deflector {
            id: structure,
            owner: 1,
            cell: 500500,
            orientation: "NE".into(),
        });
        register(&mut world, Kind::Deflector, structure, 500500).unwrap();
        assert!(exempts(&world, id, Kind::Deflector, structure, 500500));
        assert!(!exempts(&world, id + 1, Kind::Deflector, structure, 500500));
        let encoded = world.encode().unwrap();
        assert_eq!(World::decode(&encoded).unwrap(), world);
        let crossing =
            crate::geometry::next_crossing(&world.balls[0], world.width, &world.time).unwrap();
        let intent = crate::geometry::classify(&world, &world.balls[0], crossing);
        assert!(intent.targets[0].pass);
        world.balls[0].cell = 500500;
        world.validate().unwrap();
        world.balls[0].cell = 500499;
        retire_after_contact(&mut world, id);
        assert!(world.passage_exceptions.is_empty());
        assert!(!exempts(&world, id, Kind::Deflector, structure, 500500));
    }
}
