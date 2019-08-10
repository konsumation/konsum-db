import test from "ava";
import tmp from "tmp";
import levelup from "levelup";
import leveldown from "leveldown";

import { Category } from "../src/category.mjs";

test("categories write / read", async t => {
  const db = await levelup(leveldown(tmp.tmpNameSync()));

  for (let i = 0; i < 10; i++) {
    const c = new Category(`CAT-${i}`, { unit: "kWh" });
    await c.write(db);
  }

  const cs = [];

  for await (const c of Category.entries(db)) {
    cs.push(c);
  }

  t.true(cs.length >= 10);
  t.is(cs[0].unit, "kWh");

  const c = await Category.entry(db, "CAT-7");
  t.is(c.name, "CAT-7");
  t.is(c.unit, "kWh");

  db.close();
});

const SECONDS_A_DAY = 60 * 60 * 24;

test("values write / read", async t => {
  const dbf = tmp.tmpNameSync();
  //t.log(dbf);
  const db = await levelup(leveldown(dbf));
  const c = new Category(`CAT-1`, { unit: "kWh" });
  await c.write(db);

  const first = Date.now();
  const firstValue = 77.34;
  let last = first;
  let lastValue = firstValue;

  for (let i = 0; i < 100; i++) {
    last = new Date(first + SECONDS_A_DAY * i).getTime();
    lastValue = firstValue + i;
    await c.writeValue(db, lastValue, last);
  }

  let values = [];

  for await (const { value, time } of c.values(db)) {
    values.push({ value, time });
  }

  t.true(values.length >= 100);
  t.deepEqual(values[0], { value: firstValue, time: first });

  values = [];
  for await (const { value, time } of c.values(db,{ gte: first + SECONDS_A_DAY * 99, reverse:true})) {
    values.push({ value, time });
  }
  //t.log("VALUES", values);

  t.is(values.length, 1);
  t.deepEqual(values[0], { value: lastValue, time: last });
});

test.skip("values  pipe", async t => {
  const dbf = tmp.tmpNameSync();
  const db = await levelup(leveldown(dbf));
  const c = new Category(`CAT-1`, { unit: "kWh" });
  await c.write(db);

  const first = Date.now();
  const firstValue = 77.34;
  let last = first;
  let lastValue = firstValue;

  for (let i = 0; i < 100; i++) {
    last = new Date(first + SECONDS_A_DAY * i).getTime();
    lastValue = firstValue + i;
    await c.writeValue(db, lastValue, last);
  }

  await c.pipe(db,process.stdout);
});
