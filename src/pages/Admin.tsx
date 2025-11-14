import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceTypesPanel } from "@/components/admin/FinanceTypesPanel";
import { DepartmentsPanel } from "@/components/admin/DepartmentsPanel";
import { StaffPanel } from "@/components/admin/StaffPanel";
import { SalariesPanel } from "@/components/admin/SalariesPanel";
import { AccountsPanel } from "@/components/admin/AccountsPanel";

const Admin = () => {
  return (
    <AppLayout
      title="Finance Operations Control"
      subtitle="Maintain master data, staff access, and payroll postings"
    >
      <div className="space-y-6 px-3 py-4 sm:px-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <Tabs defaultValue="finance-types" className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-center gap-2">
            <TabsTrigger value="finance-types">Finance Types</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="staff">Staff & Roles</TabsTrigger>
            <TabsTrigger value="salaries">Salaries</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="finance-types">
            <FinanceTypesPanel />
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsPanel />
          </TabsContent>

          <TabsContent value="staff">
            <StaffPanel />
          </TabsContent>

          <TabsContent value="salaries">
            <SalariesPanel />
          </TabsContent>

          <TabsContent value="accounts">
            <AccountsPanel />
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;

