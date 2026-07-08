"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { DatePickerButton } from "@/shared/ui/date-picker-button";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { applicationKeys } from "@/entities/application/model/queryKeys";
import {
  getApplications,
  getApplicationById,
  completeApplication,
  deactivateApplication,
} from "@/entities/application/api/applicationApi";
import type {
  Application,
  PlumbLogSummary,
} from "@/entities/application/model/types";
import {
  getApplicationProgressDisplay,
  sortApplicationsWithWorkedLast,
} from "@/entities/application/model/types";
import { ApplicationProgressBar } from "@/features/applications/ui/ApplicationProgressBar";
import { getMaterials } from "@/entities/material/api/materialApi";
import { getTransports } from "@/entities/transport/api/transportApi";
import { toLocalDateString } from "@/shared/utils/date";
import { MobileCard } from "@/shared/ui/mobile-card";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/shared/ui/SearchableSelect";

function StatusDot({ status }: { status: Application["status"] }) {
  const colors: Record<Application["status"], string> = {
    PENDING: "var(--muted-foreground)",
    IN_PROGRESS: "var(--warning)",
    COMPLETED: "var(--success)",
    CANCELLED: "var(--destructive)",
  };
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: colors[status] }}
    />
  );
}

function PlumbStatus({ gross }: { gross: number | null }) {
  return gross === null ? (
    <span className="text-xs font-medium" style={{ color: "var(--warning)" }}>
      В пути
    </span>
  ) : (
    <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
      Отгружено
    </span>
  );
}

function fmtKg(value: number | null | undefined): string {
  return value != null ? value.toLocaleString("ru-RU") : "—";
}

function AccordionRow({
  applicationId,
  onEdit,
  onComplete,
  onDeactivate,
  transportFilter,
}: {
  applicationId: number;
  onEdit: () => void;
  onComplete: () => void;
  onDeactivate: () => void;
  transportFilter?: number;
}) {
  const router = useRouter();
  const { data: detail, isLoading } = useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => getApplicationById(applicationId),
    staleTime: 5_000,
  });
  const allPlumbs: PlumbLogSummary[] = detail?.plumbLogs ?? [];
  const plumbs = transportFilter
    ? allPlumbs.filter((p) => p.transport?.id === transportFilter)
    : allPlumbs;
  return (
    <tr>
      <td colSpan={7} className="bg-background-elevated/50 px-4 pb-4 pt-2">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Редактировать
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() =>
              router.push("/plumb/new?applicationId=" + applicationId)
            }
          >
            + Взвешивание
          </Button>
          {detail?.status !== "COMPLETED" && detail?.status !== "CANCELLED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if ((detail?.progress?.loadingVolume ?? 0) > 0) {
                  toast.error(
                    "Нельзя завершить досрочно: есть отвесы в процессе погрузки.",
                  );
                  return;
                }
                if ((detail?.progress?.shippedVolume ?? 0) === 0) {
                  toast.error(
                    "Нельзя завершить досрочно: нет ни одного завершенного отвеса (отгружено 0 м³).",
                  );
                  return;
                }
                if (window.confirm("Завершить заявку досрочно?")) onComplete();
              }}
            >
              Завершить досрочно
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (window.confirm("Деактивировать заявку?")) onDeactivate();
            }}
          >
            Деактивировать
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : plumbs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Отвесов пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "ID",
                    "Авто",
                    "Водитель",
                    "1е взвешивание",
                    "2е взвешивание",
                    "Тара",
                    "Брутто",
                    "Нетто",
                    "БСУ",
                    "Куб.",
                    "Статус",
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plumbs.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() =>
                      router.push(
                        `/plumb/view/${p.id}?backUrl=${encodeURIComponent("/journal")}&backLabel=${encodeURIComponent("Журнал заявок")}`,
                      )
                    }
                  >
                    <td className="py-2 pr-4 text-muted-foreground">{p.id}</td>
                    <td className="py-2 pr-4">
                      {p.transport?.plateNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{p.driver?.fullName ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {p.firstWeighingAt
                        ? new Date(p.firstWeighingAt).toLocaleTimeString("ru", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {p.secondWeighingAt
                        ? new Date(p.secondWeighingAt).toLocaleTimeString(
                            "ru",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {fmtKg(p.tare)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {fmtKg(p.gross)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {fmtKg(p.net)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {p.bsu?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {p.volume != null ? p.volume.toFixed(2) : "—"}
                    </td>
                    <td className="py-2">
                      <PlumbStatus gross={p.gross} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Mobile (< md): раскрытие заявки → действия + отвесы под-карточками ────────
function JournalMobileExpanded({
  applicationId,
  onEdit,
  onComplete,
  onDeactivate,
  transportFilter,
}: {
  applicationId: number;
  onEdit: () => void;
  onComplete: () => void;
  onDeactivate: () => void;
  transportFilter?: number;
}) {
  const router = useRouter();
  const { data: detail, isLoading } = useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => getApplicationById(applicationId),
    staleTime: 15_000,
  });
  const allPlumbs: PlumbLogSummary[] = detail?.plumbLogs ?? [];
  const plumbs = transportFilter
    ? allPlumbs.filter((p) => p.transport?.id === transportFilter)
    : allPlumbs;
  return (
    <div className="mb-3 ml-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Редактировать
        </Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() =>
            router.push("/plumb/new?applicationId=" + applicationId)
          }
        >
          + Взвешивание
        </Button>
        {detail?.status !== "COMPLETED" && detail?.status !== "CANCELLED" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if ((detail?.progress?.loadingVolume ?? 0) > 0) {
                toast.error(
                  "Нельзя завершить досрочно: есть отвесы в процессе погрузки.",
                );
                return;
              }
              if ((detail?.progress?.shippedVolume ?? 0) === 0) {
                toast.error(
                  "Нельзя завершить досрочно: нет ни одного завершенного отвеса (отгружено 0 м³).",
                );
                return;
              }
              if (window.confirm("Завершить заявку досрочно?")) onComplete();
            }}
          >
            Завершить досрочно
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (window.confirm("Деактивировать заявку?")) onDeactivate();
          }}
        >
          Деактивировать
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : plumbs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Отвесов пока нет</p>
      ) : (
        plumbs.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-border bg-background-elevated p-3 active:bg-background-elevated-2"
            onClick={() =>
              router.push(
                `/plumb/view/${p.id}?backUrl=${encodeURIComponent("/journal")}&backLabel=${encodeURIComponent("Журнал заявок")}`,
              )
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                #{p.id} · {p.transport?.plateNumber ?? "—"}
              </span>
              <PlumbStatus gross={p.gross} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Водитель</span>
                <div>{p.driver?.fullName ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Куб.</span>
                <div>{p.volume != null ? p.volume.toFixed(2) : "—"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Тара</span>
                <div>{fmtKg(p.tare)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Брутто</span>
                <div>{fmtKg(p.gross)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Нетто</span>
                <div>{fmtKg(p.net)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">БСУ</span>
                <div>{p.bsu?.name ?? "—"}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function ApplicationsJournalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = toLocalDateString(new Date());
  const [date, setDate] = useState(today);
  const [materialId, setMaterialId] = useState<number | undefined>();
  const [transportId, setTransportId] = useState<number | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadMaterialOptions = async (search: string): Promise<SearchableOption[]> => {
    const data = await getMaterials({ isActive: true, search: search || undefined });
    return data.map((m) => ({ id: m.id, label: m.name }));
  };

  const loadTransportOptions = async (search: string): Promise<SearchableOption[]> => {
    const data = await getTransports({ isActive: true, search: search || undefined });
    return data.map((t) => ({ id: t.id, label: t.plateNumber }));
  };

  const { data: applications = [], isLoading } = useQuery({
    queryKey: applicationKeys.list({
      deliveryDate: date,
      isActive: true,
      materialId,
    }),
    queryFn: () =>
      getApplications({ deliveryDate: date, isActive: true, materialId }),
    refetchInterval: 30_000,
  });

  const totalShipped = applications.reduce(
    (s, a) => s + a.progress.shippedVolume,
    0,
  );
  const totalLoading = applications.reduce(
    (s, a) => s + getApplicationProgressDisplay(a).loading,
    0,
  );
  const totalPlan = applications.reduce(
    (s, a) => s + getApplicationProgressDisplay(a).total,
    0,
  );
  const listApplications = sortApplicationsWithWorkedLast(applications);

  // При активном фильтре по транспорту подгружаем детали всех заявок (кэшируются)
  const appDetailQueries = useQueries({
    queries: transportId
      ? listApplications.map((app) => ({
          queryKey: applicationKeys.detail(app.id),
          queryFn: () => getApplicationById(app.id),
          staleTime: 5_000,
        }))
      : [],
  });

  const filteredApplications = useMemo(() => {
    if (!transportId) return listApplications;
    const detailsLoaded = appDetailQueries.every((q) => !q.isLoading);
    if (!detailsLoaded) return [];
    return listApplications.filter((app, idx) => {
      const detail = appDetailQueries[idx]?.data;
      return detail?.plumbLogs?.some((p) => p.transport?.id === transportId) ?? false;
    });
  }, [transportId, listApplications, appDetailQueries]);

  const completeMutation = useMutation({
    mutationFn: completeApplication,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
      toast.success("Заявка завершена");
      setExpandedId(null);
    },
    onError: (e: any) =>
      toast.error(e?.message || "Ошибка при завершении заявки"),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateApplication,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
      toast.success("Заявка деактивирована");
      setExpandedId(null);
    },
    onError: (e: any) => toast.error(e?.message || "Ошибка при деактивации"),
  });

  const formattedDate = new Intl.DateTimeFormat("ru", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date + "T00:00:00"));

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Журнал заявок
        </h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span className="capitalize">{formattedDate}</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { label: "Отгружено", value: totalShipped, color: "var(--success)" },
          { label: "В процессе", value: totalLoading, color: "var(--warning)" },
          { label: "План", value: totalPlan, color: undefined },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg px-4 py-3 bg-muted"
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
            />
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold text-foreground">
                {value.toFixed(2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  м³
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DatePickerButton
          value={date}
          onChange={setDate}
          className="w-[180px]"
        />
        <Button variant="outline" size="sm" onClick={() => setDate(today)}>
          Сегодня
        </Button>
        <div className="w-[200px]">
          <SearchableSelect
            value={materialId}
            onChange={(id) => setMaterialId(id)}
            loadOptions={loadMaterialOptions}
            placeholder="Все материалы"
            clearLabel="Все материалы"
          />
        </div>
        <div className="w-[200px]">
          <SearchableSelect
            value={transportId}
            onChange={(id) => setTransportId(id)}
            loadOptions={loadTransportOptions}
            placeholder="Все машины"
            clearLabel="Все машины"
          />
        </div>
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-12 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Время
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Заказчик
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Объект
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Материал
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Объём
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[180px]">
                    Прогресс
                  </th>
                </tr>
              </thead>
              <tbody>
                {transportId && appDetailQueries.some((q) => q.isLoading) ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Заявок на выбранную дату нет
                    </td>
                  </tr>
                ) : (
                  filteredApplications.flatMap((app, index) => {
                    const progress = getApplicationProgressDisplay(app);
                    return [
                      <tr
                        key={app.id}
                        className={`border-b border-border cursor-pointer transition-colors hover:bg-background-elevated ${index % 2 === 1 ? "bg-foreground/[0.02]" : ""}`}
                        onClick={() =>
                          setExpandedId(expandedId === app.id ? null : app.id)
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusDot status={app.status} />
                            {expandedId === app.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {app.deliveryTime ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {app.customer.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {app.object.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {app.material.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {progress.targetVolumeLabel} м³
                        </td>
                        <td className="px-4 py-3">
                          <ApplicationProgressBar
                            shipped={progress.shipped}
                            loading={progress.loading}
                            total={progress.total}
                            completed={progress.isCompleted}
                            showText
                            size="sm"
                          />
                        </td>
                      </tr>,
                      ...(expandedId === app.id
                        ? [
                            <AccordionRow
                              key={`acc-${app.id}`}
                              applicationId={app.id}
                              onEdit={() => router.push("/plan/edit/" + app.id)}
                              onComplete={() => completeMutation.mutate(app.id)}
                              onDeactivate={() =>
                                deactivateMutation.mutate(app.id)
                              }
                              transportFilter={transportId}
                            />,
                          ]
                        : []),
                    ];
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cards — мобайл */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : transportId && appDetailQueries.some((q) => q.isLoading) ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Заявок на выбранную дату нет
          </div>
        ) : (
          filteredApplications.map((app) => {
            const progress = getApplicationProgressDisplay(app);
            return (
              <div key={app.id}>
                <MobileCard
                  onClick={() =>
                    setExpandedId(expandedId === app.id ? null : app.id)
                  }
                  title={`${app.deliveryTime ?? "—"} · №${app.id}`}
                  subtitle={app.customer.name}
                  badge={<StatusDot status={app.status} />}
                  actions={
                    expandedId === app.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )
                  }
                  rows={[
                    { label: "Объект", value: app.object.name },
                    { label: "Материал", value: app.material.name },
                    {
                      label: "Объём",
                      value: `${progress.targetVolumeLabel} м³`,
                    },
                  ]}
                />
                {expandedId === app.id && (
                  <JournalMobileExpanded
                    applicationId={app.id}
                    onEdit={() => router.push("/plan/edit/" + app.id)}
                    onComplete={() => completeMutation.mutate(app.id)}
                    onDeactivate={() => deactivateMutation.mutate(app.id)}
                    transportFilter={transportId}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
