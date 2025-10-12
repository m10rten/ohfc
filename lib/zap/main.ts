import zap from "./src/index.js";

interface User {
  id: number;
  name: string;
  email: string;
}

// Example validator to ensure response data conforms to expected User[]
function validateUsers(data: unknown): data is User[] {
  return (
    Array.isArray(data) &&
    data.every(
      (user) =>
        typeof user === "object" &&
        user !== null &&
        typeof (user as User).id === "number" &&
        typeof (user as User).name === "string" &&
        typeof (user as User).email === "string",
    )
  );
}

async function fetchUsers() {
  const response = await zap.get<User[]>("https://jsonplaceholder.typicode.com/users", {
    validateResponse: validateUsers,
  });

  if (response.ok) {
    console.log("Users fetched:", response.data);
  } else {
    console.error("Failed to fetch users:", response.error);
  }
}

fetchUsers();
