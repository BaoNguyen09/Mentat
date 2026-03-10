export async function getUserProfile(userId: string) {
  return {
    userId,
    sport: "table-tennis",
  };
}

export async function updateUserProgress() {
  return {
    status: "todo",
  };
}
