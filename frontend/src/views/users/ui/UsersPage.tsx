"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/shared/lib/use-pagination";
import { TablePagination } from "@/shared/ui/table-pagination";
import { MobileCard } from "@/shared/ui/mobile-card";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Search, Plus, MoreHorizontal, UserX, KeyRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  getUsersApi,
  createUserApi,
  deactivateUserApi,
  changePasswordApi,
  type CreateUserDto,
} from "@/shared/api/users";
import { useAuthStore } from "@/shared/store/auth.store";
import { USER_ROLE_LABELS, type UserRole } from "@/shared/types/user";

const ALL_ROLES = Object.entries(USER_ROLE_LABELS) as [UserRole, string][];

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Активен
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      Неактивен
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const colors: Partial<Record<UserRole, string>> = {
    ADMIN: "bg-destructive/20 text-destructive",
    DEPUTY_DIRECTOR: "bg-warning/20 text-warning",
    SALES_HEAD: "bg-purple-500/20 text-purple-500",
    MANAGER: "bg-primary/20 text-primary",
    DISPATCHER: "bg-success/20 text-success",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[role] ?? "bg-muted text-muted-foreground"}`}
    >
      {USER_ROLE_LABELS[role]}
    </span>
  );
}

function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserDto>();
  const selectedRole = watch("role");

  const mutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      toast.success("Пользователь создан");
      setOpen(false);
      reset();
      onSuccess();
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Ошибка при создании");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Новый пользователь</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>ФИО</Label>
            <Input
              placeholder="Иванов Иван Иванович"
              className="bg-background-elevated border-border"
              {...register("fullName", { required: true })}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">Обязательное поле</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Логин</Label>
            <Input
              placeholder="ivan_ivanov"
              className="bg-background-elevated border-border"
              {...register("login", { required: true })}
            />
            {errors.login && (
              <p className="text-xs text-destructive">Обязательное поле</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Пароль</Label>
            <PasswordInput
              placeholder="Минимум 4 символа"
              className="bg-background-elevated border-border"
              {...register("password", { required: true, minLength: 4 })}
            />
            {errors.password && (
              <p className="text-xs text-destructive">Минимум 4 символа</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Роль</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setValue("role", v as UserRole)}
            >
              <SelectTrigger className="bg-background-elevated border-border">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedRole && errors.role && (
              <p className="text-xs text-destructive">Выберите роль</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Заметка{" "}
              <span className="text-muted-foreground text-xs">
                (необязательно)
              </span>
            </Label>
            <Textarea
              placeholder="Дополнительная информация..."
              className="bg-background-elevated border-border resize-none"
              rows={2}
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const mutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast.success("Пароль успешно изменён");
      setOpen(false);
      reset();
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Ошибка при смене пароля");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="border-border">
          <KeyRound className="mr-2 h-4 w-4" />
          Сменить пароль
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Смена пароля</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) =>
            mutation.mutate({
              currentPassword: data.currentPassword,
              newPassword: data.newPassword,
            }),
          )}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>Текущий пароль</Label>
            <PasswordInput
              className="bg-background-elevated border-border"
              {...register("currentPassword", { required: true })}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">Обязательное поле</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Новый пароль</Label>
            <PasswordInput
              placeholder="Минимум 6 символов"
              className="bg-background-elevated border-border"
              {...register("newPassword", { required: true, minLength: 6 })}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">Минимум 6 символов</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Повторите новый пароль</Label>
            <PasswordInput
              className="bg-background-elevated border-border"
              {...register("confirmPassword", {
                required: true,
                validate: (v) =>
                  v === watch("newPassword") || "Пароли не совпадают",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message || "Обязательное поле"}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsersApi(),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUserApi,
    onSuccess: () => {
      toast.success("Пользователь деактивирован");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.login.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const { page, setPage, pageItems, total, pageCount, from, to } =
    usePagination(filtered, 10, search + "|" + roleFilter + "|" + statusFilter);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Пользователи
          </h1>
          <p className="mt-1 text-muted-foreground">
            Управление учётными записями системы
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChangePasswordDialog />
          {isAdmin && (
            <CreateUserDialog
              onSuccess={() =>
                queryClient.invalidateQueries({ queryKey: ["users"] })
              }
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или логину..."
            className="pl-9 bg-background-elevated border-border h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px] bg-background-elevated border-border">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            {ALL_ROLES.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background-elevated border-border">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table — планшет+ */}
      <div className="hidden rounded-lg border border-border bg-card md:block">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Загрузка...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Роль
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Статус
                </th>
                {isAdmin && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                pageItems.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-b border-border transition-colors hover:bg-background-elevated ${index % 2 === 1 ? "bg-foreground/[0.02]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.login}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={user.isActive} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {user.isActive && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  deactivateMutation.mutate(user.id)
                                }
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Деактивировать
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards — мобайл */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Пользователи не найдены
          </div>
        ) : (
          pageItems.map((user) => (
            <MobileCard
              key={user.id}
              title={user.fullName}
              subtitle={user.login}
              badge={<RoleBadge role={user.role} />}
              rows={[
                { label: "Статус", value: <StatusBadge isActive={user.isActive} /> },
                { label: "Примечание", value: user.note || "—" },
              ]}
              actions={
                isAdmin && user.isActive ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deactivateMutation.mutate(user.id)}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Деактивировать
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          ))
        )}
      </div>

      <div className="mt-4">
        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          from={from}
          to={to}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
