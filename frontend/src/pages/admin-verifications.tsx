import { AdminLayout } from "@/components/admin-layout";
import { OperatorSellerVerifications } from "@/components/operator-seller-verifications";

export default function AdminVerificationsPage() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl">
        <OperatorSellerVerifications compact={false} />
      </div>
    </AdminLayout>
  );
}
