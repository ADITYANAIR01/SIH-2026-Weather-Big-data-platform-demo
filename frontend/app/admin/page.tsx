import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { DeskConsole } from "@/components/admin/DeskConsole";

export default function AdminPage() {
  return (
    <AdminAuthGate>
      <DeskConsole />
    </AdminAuthGate>
  );
}