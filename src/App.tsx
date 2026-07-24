import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
