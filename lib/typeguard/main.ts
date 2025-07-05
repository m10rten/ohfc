import { t } from "./src/index.js";

const value: unknown = "hello world!";

if (t.string().is(value)) {
  console.log(value.split(" ").join(" beautiful "));
}

const User = t.object({
  hobby: t.string().check((hobby) => hobby === "football", "Cannot like anything other then football"),
  name: t.string().check((name) => name.length > 3),
  age: t
    .number()
    .nullish()
    .default(18)
    .check((age) => !!age && age > 18 && age < 101),
});

type User = t.infer<typeof User>;

const parsed = User.parse({ name: "john", age: 32, hobby: "football" });
console.log(parsed);

const name = t
  .string()
  .check((s) => s.length > 0, "Name must not be empty")
  .transform((s) => s.trim())
  .default("Anonymous")
  .nullish();

const tags = t.string().array().default([]);

const user = t.object({
  name,
  tags,
  age: t.number().nullish().default(18),
});

const result = user.parse({
  name: "   Alice   ",
  tags: ["dev", "ts"],
  age: undefined,
});
console.log("result", result);
// result: { name: "Alice", tags: ["dev", "ts"], age: 18 }

if (name.is("Bob")) {
  // "Bob" is inferred as string here!
}
