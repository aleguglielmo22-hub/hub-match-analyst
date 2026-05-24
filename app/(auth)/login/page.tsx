import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Accedi · Hub Match Analyst",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
