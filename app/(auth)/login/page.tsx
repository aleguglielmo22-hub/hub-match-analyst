import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Accedi · AG Workspace",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
