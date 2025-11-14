import { ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ContractType,
  EmploymentStatus,
  Gender,
  Role,
  Staff,
  Department,
} from "@/types/api";
import { fetchStaff, createStaff, updateStaff, deleteStaff, StaffPayload } from "@/services/staff";
import { fetchDepartments } from "@/services/departments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { ApiError } from "@/lib/api";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const roles: Role[] = ["Super Admin", "Admin", "Accountant", "Staff"];
const genderOptions: Gender[] = ["Male", "Female", "Other"];
const contractTypes: ContractType[] = ["Full-time", "Part-time", "Contract"];
const employmentStatuses: EmploymentStatus[] = ["Active", "Terminated", "On Leave"];

interface FormState {
  name: string;
  email: string;
  role: Role;
  password: string;
  is_active: boolean;
  employee_id: string;
  phone_number: string;
  aadhaar_number: string;
  pan_number: string;
  date_of_birth: string;
  gender?: Gender;
  marital_status: string;
  nationality: string;
  address: string;
  emergency_contact_number: string;
  join_date: string;
  date_of_last_promotion: string;
  job_title: string;
  department_id: string;
  manager_id: string;
  job_level: string;
  contract_type?: ContractType;
  probation_end_date: string;
  employment_status: EmploymentStatus;
  date_of_resignation: string;
  last_working_day: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  bank_branch: string;
  gpay_id: string;
  performance_rating: string;
  training_certifications: string;
  skills_competencies: string;
  professional_development: string;
  company_equipment_issued: string;
  company_equipment_returned: string;
  confidentiality_agreement_signed: boolean;
  offer_letter_url: string;
  notes: string;
}

const todayIso = new Date().toISOString().split("T")[0];

interface DetailFieldProps {
  label: string;
  value?: ReactNode;
  className?: string;
}

const DetailField = ({ label, value, className }: DetailFieldProps) => {
  const hasValue =
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim().length === 0);
  const displayValue = hasValue ? value : "—";

  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
        {displayValue}
      </div>
    </div>
  );
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const defaultFormState: FormState = {
  name: "",
  email: "",
  role: "Staff",
  password: "",
  is_active: true,
  employee_id: "",
  phone_number: "",
  aadhaar_number: "",
  pan_number: "",
  date_of_birth: "",
  gender: undefined,
  marital_status: "",
  nationality: "",
  address: "",
  emergency_contact_number: "",
  join_date: todayIso,
  date_of_last_promotion: "",
  job_title: "",
  department_id: "",
  manager_id: "",
  job_level: "",
  contract_type: undefined,
  probation_end_date: "",
  employment_status: "Active",
  date_of_resignation: "",
  last_working_day: "",
  account_number: "",
  ifsc_code: "",
  bank_name: "",
  bank_branch: "",
  gpay_id: "",
  performance_rating: "",
  training_certifications: "",
  skills_competencies: "",
  professional_development: "",
  company_equipment_issued: "",
  company_equipment_returned: "",
  confidentiality_agreement_signed: false,
  offer_letter_url: "",
  notes: "",
};

export const StaffPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [viewTab, setViewTab] = useState("core");

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(200),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "for-staff"],
    queryFn: () => fetchDepartments(200),
  });

  const createMutation = useMutation({
    mutationFn: (payload: StaffPayload) => createStaff(payload),
    onSuccess: () => {
      toast({ title: "Staff member created" });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to create staff member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ staffId, payload }: { staffId: string; payload: Partial<StaffPayload> }) =>
      updateStaff(staffId, payload),
    onSuccess: () => {
      toast({ title: "Staff member updated" });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update staff member"),
  });

  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => deleteStaff(staffId),
    onSuccess: () => {
      toast({ title: "Staff member updated" });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: unknown) => showError(error, "Unable to delete staff member"),
  });

  const showError = (error: unknown, fallback: string) => {
    const message = error instanceof ApiError ? error.message : fallback;
    toast({
      title: "Request failed",
      description: message,
      variant: "destructive",
    });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormState(defaultFormState);
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setViewingStaff(null);
  };

  const openCreateDialog = () => {
    setEditing(null);
    const departmentId = departments[0]?.dept_id ?? "";
    setFormState({
      ...defaultFormState,
      department_id: departmentId,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (staff: Staff) => {
    setEditing(staff);
    setFormState({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      password: "",
      is_active: staff.is_active,
      employee_id: staff.employee_id ?? "",
      phone_number: staff.phone_number ?? "",
      aadhaar_number: staff.aadhaar_number ?? "",
      pan_number: staff.pan_number ?? "",
      date_of_birth: staff.date_of_birth ?? "",
      gender: staff.gender ?? undefined,
      marital_status: staff.marital_status ?? "",
      nationality: staff.nationality ?? "",
      address: staff.address ?? "",
      emergency_contact_number: staff.emergency_contact_number ?? "",
      join_date: staff.join_date ?? todayIso,
      date_of_last_promotion: staff.date_of_last_promotion ?? "",
      job_title: staff.job_title ?? "",
      department_id: staff.department_id ?? (departments[0]?.dept_id ?? ""),
      manager_id: staff.manager_id ?? "",
      job_level: staff.job_level ?? "",
      contract_type: staff.contract_type ?? undefined,
      probation_end_date: staff.probation_end_date ?? "",
      employment_status: staff.employment_status ?? "Active",
      date_of_resignation: staff.date_of_resignation ?? "",
      last_working_day: staff.last_working_day ?? "",
      account_number: staff.account_number ?? "",
      ifsc_code: staff.ifsc_code ?? "",
      bank_name: staff.bank_name ?? "",
      bank_branch: staff.bank_branch ?? "",
      gpay_id: staff.gpay_id ?? "",
      performance_rating: staff.performance_rating ?? "",
      training_certifications: (staff.training_certifications ?? []).join(", "),
      skills_competencies: (staff.skills_competencies ?? []).join(", "),
      professional_development: (staff.professional_development ?? []).join(", "),
      company_equipment_issued: (staff.company_equipment_issued ?? []).join(", "),
      company_equipment_returned: (staff.company_equipment_returned ?? []).join(", "),
      confidentiality_agreement_signed: staff.confidentiality_agreement_signed ?? false,
      offer_letter_url: staff.offer_letter_url ?? "",
      notes: staff.notes ?? "",
    });
    setDialogOpen(true);
  };

  const openViewDialog = (staff: Staff) => {
    setViewingStaff(staff);
    setViewTab("core");
    setViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    if (!viewingStaff) return;
    openEditDialog(viewingStaff);
    closeViewDialog();
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: string[] = [];

    if (!formState.employee_id.trim()) {
      errors.push("Employee ID is required.");
    }

    if (!formState.aadhaar_number.trim()) {
      errors.push("Aadhaar number is required.");
    }

    if (!formState.pan_number.trim()) {
      errors.push("PAN number is required.");
    }

    if (!formState.join_date) {
      errors.push("Join date is required.");
    }

    if (!editing && formState.password.trim().length < 8) {
      errors.push("Password must be at least 8 characters.");
    }

    if (errors.length) {
      toast({
        title: "Cannot save profile",
        description: errors.join(" "),
        variant: "destructive",
      });
      return;
    }

    const parseList = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const trainingCertifications = parseList(formState.training_certifications);
    const skillsCompetencies = parseList(formState.skills_competencies);
    const professionalDevelopment = parseList(formState.professional_development);
    const equipmentIssued = parseList(formState.company_equipment_issued);
    const equipmentReturned = parseList(formState.company_equipment_returned);

    const payloadBase: StaffPayload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      role: formState.role,
      is_active: formState.is_active,
      employee_id: formState.employee_id.trim(),
      phone_number: formState.phone_number.trim() || undefined,
      aadhaar_number: formState.aadhaar_number.trim(),
      pan_number: formState.pan_number.trim(),
      date_of_birth: formState.date_of_birth || undefined,
      gender: formState.gender,
      marital_status: formState.marital_status.trim() || undefined,
      nationality: formState.nationality.trim() || undefined,
      address: formState.address.trim() || undefined,
      emergency_contact_number: formState.emergency_contact_number.trim() || undefined,
      join_date: formState.join_date,
      date_of_last_promotion: formState.date_of_last_promotion || undefined,
      job_title: formState.job_title.trim() || undefined,
      department_id: formState.department_id || undefined,
      manager_id: formState.manager_id.trim() || undefined,
      job_level: formState.job_level.trim() || undefined,
      contract_type: formState.contract_type,
      probation_end_date: formState.probation_end_date || undefined,
      employment_status: formState.employment_status,
      date_of_resignation: formState.date_of_resignation || undefined,
      last_working_day: formState.last_working_day || undefined,
      account_number: formState.account_number.trim() || undefined,
      ifsc_code: formState.ifsc_code.trim() || undefined,
      bank_name: formState.bank_name.trim() || undefined,
      bank_branch: formState.bank_branch.trim() || undefined,
      gpay_id: formState.gpay_id.trim() || undefined,
      performance_rating: formState.performance_rating.trim() || undefined,
      training_certifications: trainingCertifications.length ? trainingCertifications : undefined,
      skills_competencies: skillsCompetencies.length ? skillsCompetencies : undefined,
      professional_development: professionalDevelopment.length ? professionalDevelopment : undefined,
      company_equipment_issued: equipmentIssued.length ? equipmentIssued : undefined,
      company_equipment_returned: equipmentReturned.length ? equipmentReturned : undefined,
      confidentiality_agreement_signed: formState.confidentiality_agreement_signed,
      offer_letter_url: formState.offer_letter_url.trim() || undefined,
      notes: formState.notes.trim() || undefined,
    };

    if (editing) {
      const updatePayload: Partial<StaffPayload> = {
        ...payloadBase,
      };

      if (formState.password.trim()) {
        updatePayload.password = formState.password.trim();
      }

      updateMutation.mutate({ staffId: editing.staff_id, payload: updatePayload });
    } else {
      const createPayload: StaffPayload = {
        ...payloadBase,
        password: formState.password.trim(),
      };

      createMutation.mutate(createPayload);
    }
  };

  const toggleActive = (staff: Staff) => {
    updateMutation.mutate({
      staffId: staff.staff_id,
      payload: { is_active: !staff.is_active },
    });
  };

  const sortedStaff = useMemo(() => {
    if (!staffQuery.data) {
      return [];
    }

    return [...staffQuery.data].sort((a, b) => a.name.localeCompare(b.name));
  }, [staffQuery.data]);

  const departments = departmentsQuery.data ?? [];

  const departmentLookup = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((department) => {
      map.set(department.dept_id, department);
    });
    return map;
  }, [departments]);

  const managerLookup = useMemo(() => {
    const map = new Map<string, Staff>();
    staffQuery.data?.forEach((staff) => {
      if (staff.employee_id) {
        map.set(staff.employee_id, staff);
      }
    });
    return map;
  }, [staffQuery.data]);

  const availableManagers = useMemo(() => {
    if (!staffQuery.data) return [];
    return staffQuery.data.filter((staff) => !editing || staff.staff_id !== editing.staff_id);
  }, [editing, staffQuery.data]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Staff & Roles</h2>
          <p className="text-sm text-muted-foreground">
            Control system access and finance privileges
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => staffQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Staff
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {staffQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  Loading staff...
                </TableCell>
              </TableRow>
            )}

            {staffQuery.isError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-destructive">
                  Failed to load staff list.
                </TableCell>
              </TableRow>
            )}

            {!staffQuery.isLoading &&
              sortedStaff.map((staff) => (
                <TableRow
                  key={staff.staff_id}
                  onClick={() => openViewDialog(staff)}
                  className="cursor-pointer transition hover:bg-muted/40"
                >
                  <TableCell className="font-medium text-foreground">{staff.name}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{staff.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.is_active ? "outline" : "secondary"}>
                      {staff.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell
                    className="flex items-center justify-end gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Edit staff profile"
                          onClick={() => openEditDialog(staff)}
                          disabled={updateMutation.isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Profile</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                          aria-label="Delete staff profile"
                          onClick={() => deleteMutation.mutate(staff.staff_id)}
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Profile</TooltipContent>
                    </Tooltip>
                    <Switch
                      checked={staff.is_active}
                      onCheckedChange={() => toggleActive(staff)}
                      disabled={updateMutation.isLoading}
                    />
                  </TableCell>
                </TableRow>
              ))}

            {!staffQuery.isLoading && sortedStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No staff members yet. Invite your first colleague to collaborate.
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => !open && closeViewDialog()}>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          {viewingStaff && (
            <Tabs value={viewTab} onValueChange={setViewTab} className="flex h-full max-h-[90vh] flex-col">
              <div className="sticky top-0 z-20 border-b border-border/40 bg-card px-6 py-5">
                <DialogHeader className="space-y-2 p-0">
                  <DialogTitle>{`Staff Profile Details: ${viewingStaff.name}`}</DialogTitle>
                  <DialogDescription>
                    Review all captured details for this staff member. Use the tabs to switch between sections.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                    <TabsTrigger value="core">Core Details &amp; Access</TabsTrigger>
                    <TabsTrigger value="personal">Personal &amp; Contact</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll &amp; Bank</TabsTrigger>
                    <TabsTrigger value="employment">Employment &amp; Audit</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-5 pr-3">
                <div className="pr-1 space-y-6">
                  <TabsContent value="core" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField label="Name" value={viewingStaff.name} />
                      <DetailField label="Email" value={viewingStaff.email} />
                      <DetailField label="Role" value={viewingStaff.role} />
                      <DetailField label="Employee ID" value={viewingStaff.employee_id} />
                      <DetailField label="Join Date" value={formatDisplayDate(viewingStaff.join_date)} />
                      <DetailField label="Job Title" value={viewingStaff.job_title} />
                      <DetailField label="Job Level" value={viewingStaff.job_level} />
                      <DetailField label="Access Status" value={viewingStaff.is_active ? "Active" : "Inactive"} />
                    </div>
                  </TabsContent>

                  <TabsContent value="personal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField label="Phone Number" value={viewingStaff.phone_number} />
                      <DetailField label="Emergency Contact" value={viewingStaff.emergency_contact_number} />
                      <DetailField label="Aadhaar Number" value={viewingStaff.aadhaar_number} />
                      <DetailField label="PAN Number" value={viewingStaff.pan_number} />
                      <DetailField label="Date of Birth" value={formatDisplayDate(viewingStaff.date_of_birth)} />
                      <DetailField label="Gender" value={viewingStaff.gender} />
                      <DetailField label="Marital Status" value={viewingStaff.marital_status} />
                      <DetailField label="Nationality" value={viewingStaff.nationality} />
                      <DetailField
                        label="Address"
                        className="md:col-span-2"
                        value={
                          viewingStaff.address ? (
                            <span className="whitespace-pre-line">{viewingStaff.address}</span>
                          ) : undefined
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="payroll" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField label="Account Number" value={viewingStaff.account_number} />
                      <DetailField label="IFSC Code" value={viewingStaff.ifsc_code} />
                      <DetailField label="Bank Name" value={viewingStaff.bank_name} />
                      <DetailField label="Bank Branch" value={viewingStaff.bank_branch} />
                      <DetailField label="GPay / UPI ID" className="md:col-span-2" value={viewingStaff.gpay_id} />
                    </div>
                  </TabsContent>

                  <TabsContent value="employment" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField
                        label="Department"
                        value={viewingStaff.department_id ? departmentLookup.get(viewingStaff.department_id)?.name : undefined}
                      />
                      <DetailField
                        label="Manager"
                        value={
                          viewingStaff.manager_id
                            ? (() => {
                                const manager = managerLookup.get(viewingStaff.manager_id);
                                if (manager) {
                                  return manager.employee_id
                                    ? `${manager.name} (${manager.employee_id})`
                                    : manager.name;
                                }
                                return viewingStaff.manager_id;
                              })()
                            : undefined
                        }
                      />
                      <DetailField label="Contract Type" value={viewingStaff.contract_type} />
                      <DetailField label="Probation End Date" value={formatDisplayDate(viewingStaff.probation_end_date)} />
                      <DetailField label="Employment Status" value={viewingStaff.employment_status} />
                      <DetailField label="Date of Last Promotion" value={formatDisplayDate(viewingStaff.date_of_last_promotion)} />
                      <DetailField label="Date of Resignation" value={formatDisplayDate(viewingStaff.date_of_resignation)} />
                      <DetailField label="Last Working Day" value={formatDisplayDate(viewingStaff.last_working_day)} />
                      <DetailField label="Performance Rating" value={viewingStaff.performance_rating} />
                      <DetailField
                        label="Confidentiality Agreement"
                        value={viewingStaff.confidentiality_agreement_signed ? "Signed" : "Pending"}
                      />
                      <DetailField
                        label="Offer Letter"
                        className="md:col-span-2"
                        value={
                          viewingStaff.offer_letter_url ? (
                            <a
                              href={viewingStaff.offer_letter_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-4"
                            >
                              {viewingStaff.offer_letter_url}
                            </a>
                          ) : undefined
                        }
                      />
                      <DetailField
                        label="Training & Certifications"
                        className="md:col-span-2"
                        value={viewingStaff.training_certifications?.length ? viewingStaff.training_certifications.join(", ") : undefined}
                      />
                      <DetailField
                        label="Skills & Competencies"
                        className="md:col-span-2"
                        value={viewingStaff.skills_competencies?.length ? viewingStaff.skills_competencies.join(", ") : undefined}
                      />
                      <DetailField
                        label="Professional Development"
                        className="md:col-span-2"
                        value={
                          viewingStaff.professional_development?.length
                            ? viewingStaff.professional_development.join(", ")
                            : undefined
                        }
                      />
                      <DetailField
                        label="Company Equipment Issued"
                        className="md:col-span-2"
                        value={
                          viewingStaff.company_equipment_issued?.length
                            ? viewingStaff.company_equipment_issued.join(", ")
                            : undefined
                        }
                      />
                      <DetailField
                        label="Company Equipment Returned"
                        className="md:col-span-2"
                        value={
                          viewingStaff.company_equipment_returned?.length
                            ? viewingStaff.company_equipment_returned.join(", ")
                            : undefined
                        }
                      />
                      <DetailField
                        label="Notes"
                        className="md:col-span-2"
                        value={
                          viewingStaff.notes ? (
                            <span className="whitespace-pre-line">{viewingStaff.notes}</span>
                          ) : undefined
                        }
                      />
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              <DialogFooter className="border-t border-border/40 px-6 py-4">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Last updated: {formatDisplayDate(viewingStaff.updated_at ?? viewingStaff.created_at)}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" type="button" onClick={closeViewDialog}>
                      Close
                    </Button>
                    <Button type="button" onClick={handleEditFromView}>
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <div className="flex h-full max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-border/40 px-6 py-5">
            <DialogTitle>{editing ? "Edit employee profile" : "New employee profile"}</DialogTitle>
            <DialogDescription>
              Capture core, personal, payroll, and compliance details for this employee. Required fields are marked.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
            <ScrollArea className="flex-1 px-6 py-5 pr-3">
              <div className="pr-1">
                <Tabs defaultValue="core" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                    <TabsTrigger value="core">Core Details & Access</TabsTrigger>
                    <TabsTrigger value="personal">Personal & Contact</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll & Bank</TabsTrigger>
                    <TabsTrigger value="employment">Employment & Audit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="core" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="staff-name">
                Name
              </label>
              <Input
                id="staff-name"
                placeholder="Full name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="staff-email">
                Email
              </label>
              <Input
                id="staff-email"
                type="email"
                placeholder="name@codo.ai"
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select
                value={formState.role}
                          onValueChange={(value: Role) =>
                            setFormState((prev) => ({ ...prev, role: value }))
                          }
              >
                <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="staff-password"
                        >
                Password {editing ? "(leave blank to keep existing)" : ""}
              </label>
              <Input
                id="staff-password"
                type="password"
                placeholder={editing ? "••••••••" : "Minimum 8 characters"}
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, password: event.target.value }))
                }
                required={!editing}
                minLength={8}
              />
            </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="employee-id"
                        >
                          Employee ID
                        </label>
                        <Input
                          id="employee-id"
                          placeholder="EMP-XXXX"
                          value={formState.employee_id}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, employee_id: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="join-date">
                          Join Date
                        </label>
                        <Input
                          id="join-date"
                          type="date"
                          value={formState.join_date}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, join_date: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="job-title">
                          Job Title
                        </label>
                        <Input
                          id="job-title"
                          placeholder="e.g. Senior Accountant"
                          value={formState.job_title}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, job_title: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="job-level"
                        >
                          Job Level
                        </label>
                        <Input
                          id="job-level"
                          placeholder="Level 3"
                          value={formState.job_level}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, job_level: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active status</p>
                <p className="text-xs text-muted-foreground">
                  Deactivate to suspend access without deleting history
                </p>
              </div>
              <Switch
                checked={formState.is_active}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
                  </TabsContent>

                  <TabsContent value="personal">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="phone-number">
                          Phone Number
                        </label>
                        <Input
                          id="phone-number"
                          placeholder="+91-"
                          value={formState.phone_number}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, phone_number: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="aadhaar-number">
                          Aadhaar Number
                        </label>
                        <Input
                          id="aadhaar-number"
                          placeholder="XXXX-XXXX-XXXX"
                          value={formState.aadhaar_number}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, aadhaar_number: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="pan-number">
                          PAN Number
                        </label>
                        <Input
                          id="pan-number"
                          placeholder="ABCDE1234F"
                          value={formState.pan_number}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, pan_number: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="dob">
                          Date of Birth
                        </label>
                        <Input
                          id="dob"
                          type="date"
                          value={formState.date_of_birth}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, date_of_birth: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Gender</label>
                        <Select
                          value={formState.gender ?? "unspecified"}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              gender: value === "unspecified" ? undefined : (value as Gender),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">Not specified</SelectItem>
                            {genderOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="marital-status"
                        >
                          Marital Status
                        </label>
                        <Input
                          id="marital-status"
                          placeholder="Single, Married..."
                          value={formState.marital_status}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, marital_status: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="nationality">
                          Nationality
                        </label>
                        <Input
                          id="nationality"
                          placeholder="Indian"
                          value={formState.nationality}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, nationality: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="emergency-contact"
                        >
                          Emergency Contact Number
                        </label>
                        <Input
                          id="emergency-contact"
                          placeholder="+91-"
                          value={formState.emergency_contact_number}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              emergency_contact_number: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="address">
                        Address
                      </label>
                      <Textarea
                        id="address"
                        placeholder="Flat, Street, City, State"
                        value={formState.address}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, address: event.target.value }))
                        }
                        className="min-h-[90px]"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="payroll">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="account-number"
                        >
                          Account Number
                        </label>
                        <Input
                          id="account-number"
                          placeholder="Bank account number"
                          value={formState.account_number}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, account_number: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="ifsc-code">
                          IFSC Code
                        </label>
                        <Input
                          id="ifsc-code"
                          placeholder="IFSCXXXXX"
                          value={formState.ifsc_code}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, ifsc_code: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="bank-name">
                          Bank Name
                        </label>
                        <Input
                          id="bank-name"
                          placeholder="Bank name"
                          value={formState.bank_name}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, bank_name: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="bank-branch">
                          Bank Branch
                        </label>
                        <Input
                          id="bank-branch"
                          placeholder="Branch name"
                          value={formState.bank_branch}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, bank_branch: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="gpay-id">
                          GPay / UPI ID
                        </label>
                        <Input
                          id="gpay-id"
                          placeholder="name@upi"
                          value={formState.gpay_id}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, gpay_id: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="employment" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Department</label>
                        <Select
                          value={formState.department_id || "unassigned"}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              department_id: value === "unassigned" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {departments.map((department: Department) => (
                              <SelectItem key={department.dept_id} value={department.dept_id}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Manager</label>
                        <Select
                          value={formState.manager_id || "unassigned"}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              manager_id: value === "unassigned" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {availableManagers.map((manager) =>
                              manager.employee_id ? (
                                <SelectItem key={manager.staff_id} value={manager.employee_id}>
                                  {manager.name} ({manager.employee_id})
                                </SelectItem>
                              ) : null,
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Contract Type</label>
                        <Select
                          value={formState.contract_type ?? "unspecified"}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              contract_type: value === "unspecified" ? undefined : (value as ContractType),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">Not set</SelectItem>
                            {contractTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="probation-end-date"
                        >
                          Probation End Date
                        </label>
                        <Input
                          id="probation-end-date"
                          type="date"
                          value={formState.probation_end_date}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              probation_end_date: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Employment Status
                        </label>
                        <Select
                          value={formState.employment_status}
                          onValueChange={(value: EmploymentStatus) =>
                            setFormState((prev) => ({ ...prev, employment_status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {employmentStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="last-promotion"
                        >
                          Date of Last Promotion
                        </label>
                        <Input
                          id="last-promotion"
                          type="date"
                          value={formState.date_of_last_promotion}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              date_of_last_promotion: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="date-of-resignation"
                        >
                          Date of Resignation
                        </label>
                        <Input
                          id="date-of-resignation"
                          type="date"
                          value={formState.date_of_resignation}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              date_of_resignation: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="last-working-day"
                        >
                          Last Working Day
                        </label>
                        <Input
                          id="last-working-day"
                          type="date"
                          value={formState.last_working_day}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              last_working_day: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="performance-rating"
                        >
                          Performance Rating
                        </label>
                        <Input
                          id="performance-rating"
                          placeholder="Outstanding, Exceeds expectations..."
                          value={formState.performance_rating}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              performance_rating: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="offer-letter-url"
                        >
                          Offer Letter URL
                        </label>
                        <Input
                          id="offer-letter-url"
                          type="url"
                          placeholder="https://..."
                          value={formState.offer_letter_url}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              offer_letter_url: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Confidentiality Agreement Signed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Track whether the employee has signed the NDA/HR agreements
                        </p>
                      </div>
                      <Switch
                        checked={formState.confidentiality_agreement_signed}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({
                            ...prev,
                            confidentiality_agreement_signed: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="training">
                          Training & Certifications (comma separated)
                        </label>
                        <Textarea
                          id="training"
                          placeholder="GST Compliance, Advanced Excel"
                          value={formState.training_certifications}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              training_certifications: event.target.value,
                            }))
                          }
                          className="min-h-[90px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="skills">
                          Skills & Competencies (comma separated)
                        </label>
                        <Textarea
                          id="skills"
                          placeholder="Financial Reporting, Tax Planning"
                          value={formState.skills_competencies}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              skills_competencies: event.target.value,
                            }))
                          }
                          className="min-h-[90px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="development">
                          Professional Development (comma separated)
                        </label>
                        <Textarea
                          id="development"
                          placeholder="Leadership Program 2023"
                          value={formState.professional_development}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              professional_development: event.target.value,
                            }))
                          }
                          className="min-h-[90px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="equipment-issued">
                          Company Equipment Issued (comma separated)
                        </label>
                        <Textarea
                          id="equipment-issued"
                          placeholder="Dell Laptop, ID Card"
                          value={formState.company_equipment_issued}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              company_equipment_issued: event.target.value,
                            }))
                          }
                          className="min-h-[90px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-foreground"
                          htmlFor="equipment-returned"
                        >
                          Company Equipment Returned (comma separated)
                        </label>
                        <Textarea
                          id="equipment-returned"
                          placeholder="ID Card"
                          value={formState.company_equipment_returned}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              company_equipment_returned: event.target.value,
                            }))
                          }
                          className="min-h-[90px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="notes">
                        Notes
                      </label>
                      <Textarea
                        id="notes"
                        placeholder="Additional remarks about the employee"
                        value={formState.notes}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="min-h-[90px]"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

            <DialogFooter className="border-t border-border/40 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {(createMutation.isLoading || updateMutation.isLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Profile
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
  );
};

