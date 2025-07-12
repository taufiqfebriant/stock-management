import React from "react";

export const ErrorMessage = ({ children }: { children: React.ReactNode }) => {
  return <p className="text-sm text-red-500 mt-1">{children}</p>;
};
