const LOGIN_TYPE = Object.freeze({
  EMAIL: 1,
  GOOGLE: 2,
  MICROSOFT: 3,
});

const USER_CONSTANTS = {
  LOGIN_TYPE,
  CREATED: "User created",
  UPDATED: "User updated",
  DELETED: "User deleted",
  DUPLICATE_EMAIL: "A user with this email already exists",
  NOT_FOUND: "User not found",
  NOTHING_TO_UPDATE: "No allowed fields to update",
  CANNOT_REMOVE_SELF: "You cannot delete your own account via this endpoint",
  ERROR_OCCURED: "An error occurred! Please try again",
};

module.exports = USER_CONSTANTS;
