"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  Pencil,
  RotateCcw,
  Trash2,
  Save,
  Lock,
  Link2,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DateTimePickerField } from "@/shared/ui/datetime-picker-field";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/shared/ui/SearchableSelect";
import { useScaleStore } from "@/shared/store/scaleStore";
import { isValidSlumpCone } from "@/shared/utils/slumpCone";
import { plumbLogKeys } from "@/entities/plumb-log/model/queryKeys";
import {
  getPlumbLogById,
  updatePlumbLog,
  weighTare,
  weighGross,
  createReturn,
  deactivatePlumbLog,
} from "@/entities/plumb-log/api/plumbLogApi";
import {
  getApplications,
  getApplicationById,
} from "@/entities/application/api/applicationApi";
import { applicationKeys } from "@/entities/application/model/queryKeys";
import type { Application } from "@/entities/application/model/types";
import { getCompanies } from "@/entities/company/api/companyApi";
import { getMaterials } from "@/entities/material/api/materialApi";
import { getTransports } from "@/entities/transport/api/transportApi";
import { getDrivers } from "@/entities/driver/api/driverApi";
import { getBsuList } from "@/entities/bsu/api/bsuApi";
import { getConstructions } from "@/entities/construction/api/constructionApi";
import { getNomenclatures } from "@/entities/nomenclature/api/nomenclatureApi";
import { getObjects } from "@/entities/object/api/objectApi";
import { getCarriers } from "@/entities/carrier/api/carrierApi";
import type {
  PlumbLog,
  UpdatePlumbLogDto,
} from "@/entities/plumb-log/model/types";

interface Props {
  id: number;
  backUrl?: string;
  backLabel?: string;
}

const fmtDt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function fmt(iso: string | null) {
  return iso ? fmtDt.format(new Date(iso)) : "—";
}

function getMonitoringDisplay(plumbLog: PlumbLog) {
  const isMaterialPlumb = plumbLog.applicationId == null;
  return {
    firstAt: isMaterialPlumb
      ? plumbLog.secondWeighingAt
      : plumbLog.firstWeighingAt,
    firstOperator: isMaterialPlumb
      ? plumbLog.secondOperator
      : plumbLog.firstOperator,
    secondAt: isMaterialPlumb
      ? plumbLog.firstWeighingAt
      : plumbLog.secondWeighingAt,
    secondOperator: isMaterialPlumb
      ? plumbLog.firstOperator
      : plumbLog.secondOperator,
  };
}

function getBindingStatus(app: Application) {
  if (app.status === "COMPLETED" || app.progress.remainVolume <= 0) {
    return { label: "Выполнена", rank: 0, color: "var(--success)" };
  }
  if (
    app.status === "IN_PROGRESS" ||
    app.progress.shippedVolume > 0 ||
    app.progress.loadingVolume > 0
  ) {
    return { label: "В процессе", rank: 1, color: "var(--warning)" };
  }
  return { label: "Не начата", rank: 2, color: "var(--muted-foreground)" };
}

function sortBindingApplications(applications: Application[]): Application[] {
  return [...applications].sort((a, b) => {
    const byStatus = getBindingStatus(a).rank - getBindingStatus(b).rank;
    if (byStatus !== 0) return byStatus;
    return (a.deliveryTime ?? "").localeCompare(b.deliveryTime ?? "");
  });
}

function DecimalInput({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : "");

  useEffect(() => {
    setText((prevText) => {
      const normalized = prevText.replace(",", ".");
      const parsed =
        normalized === "" || normalized === "." || normalized.endsWith(".")
          ? null
          : Number(normalized);
      if (value === parsed) return prevText;
      return value != null ? String(value) : "";
    });
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="bg-background-elevated border-border h-9"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^\d*(?:[.,]\d*)?$/.test(raw)) return;
        setText(raw);
        const normalized = raw.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          onChange(null);
          return;
        }
        if (normalized.endsWith(".")) return;
        const next = Number(normalized);
        if (!Number.isNaN(next)) onChange(next);
      }}
      onBlur={() => {
        const normalized = text.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          setText("");
          onChange(null);
          return;
        }
        const next = Number(normalized);
        if (!Number.isNaN(next)) {
          setText(String(next));
          onChange(next);
        }
      }}
    />
  );
}

function printTTN(plumbLog: PlumbLog) {
  const pad = (n: number) => String(n).padStart(2, "0");

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const toTons = (kg: number | null, digits = 2) =>
    kg != null ? (kg / 1000).toFixed(digits) : "";

  const isMaterialPlumb = plumbLog.applicationId == null;
  const monitoring = getMonitoringDisplay(plumbLog);
  const arrivalAt = monitoring.firstAt;
  const departureAt = monitoring.secondAt;
  const docDate = formatDateTime(departureAt ?? arrivalAt);
  const grossTons = toTons(plumbLog.gross);
  const tareTons = toTons(plumbLog.tare);
  // «Количество» в ТТН — нетто за вычетом сорности (impurity, %). При impurity 0/null → чистое нетто.
  const quantityTons =
    plumbLog.net != null
      ? (
          Math.round(
            ((plumbLog.net * (1 - (plumbLog.impurity ?? 0) / 100)) / 1000) *
              100,
          ) / 100
        ).toFixed(2)
      : "";
  const grossTons3 = toTons(plumbLog.gross, 3);
  const objectName = plumbLog.object?.name;
  const recipient =
    (plumbLog.customer?.name ?? "") + (objectName ? ` (${objectName})` : "");
  const operator =
    (isMaterialPlumb
      ? (monitoring.firstOperator?.fullName ??
        monitoring.secondOperator?.fullName)
      : plumbLog.firstOperator?.fullName) ?? "";
  const driverName = plumbLog.driver?.fullName ?? "";
  const plate = plumbLog.transport?.plateNumber ?? "";
  const carrier = plumbLog.carrier?.name ?? "";
  const supplier = plumbLog.supplier?.name ?? "";
  const bsuName = plumbLog.bsu?.name ?? "";
  const material = plumbLog.material?.name ?? "";
  const seal = plumbLog.sealNumber ?? "";
  const deliveryType = plumbLog.deliveryType ?? "";
  const volumeStr = plumbLog.volume?.toFixed(2) ?? "";
  const firstTime = formatTime(arrivalAt);
  const secondTime = formatTime(departureAt);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ТТН №${plumbLog.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000; background: #fff; padding: 6mm; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; }
    .hdr .notes div { line-height: 1.3; }
    .codes-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    table.codes { border-collapse: collapse; }
    table.codes td { border: 1px solid #000; width: 22px; height: 14px; }
    .title-block { display: inline-block; text-align: right; }
    .title-block .form-name { font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 2px; white-space: nowrap; }
    .title-block .doc-title { font-size: 14px; font-weight: bold; white-space: nowrap; margin-top: 3px; }
    .title-block .doc-date { font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 4px; }
    .auto-line { display: flex; justify-content: center; align-items: flex-end; gap: 6px; margin: 5px 0 3px; }
    .auto-line .ul { border-bottom: 1px solid #000; font-weight: bold; min-width: 360px; padding: 0 6px; text-align: center; }
    table.fields { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.fields td { height: 20px; padding: 0; vertical-align: bottom; }
    table.fields td.rlbl { width: 168px; text-align: right; white-space: nowrap; padding: 0 6px 2px 10px; }
    table.fields td.rbx { width: 80px; border: 1px solid #000; }
    .fline { display: flex; align-items: flex-end; padding-bottom: 2px; }
    .fline .lbl { white-space: nowrap; padding: 0 4px 0 0; }
    .fline .ul { flex: 1 1 auto; border-bottom: 1px solid #000; font-weight: bold; padding: 0 4px; min-width: 30px; }
    .section-title { text-align: center; font-weight: bold; margin: 5px 0 2px; text-transform: uppercase; }
    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th, table.grid td { border: 1px solid #000; padding: 1px 3px; text-align: center; vertical-align: middle; }
    table.grid tr.data td { font-weight: bold; }
    .ul { border-bottom: 1px solid #000; font-weight: bold; display: inline-block; padding: 0 4px; min-width: 120px; }
    table.sigtable { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.sigtable td { vertical-align: top; padding: 0 10px; width: 34%; }
    table.sigtable td.dov { border-left: 1px solid #000; width: 32%; }
    .sline { margin: 2px 0; }
    .row2 { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    @media print { body { padding: 0; } @page { size: A4 landscape; margin: 7mm; } }
  </style>
</head>
<body>

  <div class="hdr">
    <div class="notes">
      <div>1-й экз - грузоотправителю</div>
      <div>2-й экз - грузополучателю</div>
      <div>3-й и 4-й экз - автопредприятию</div>
    </div>
    <div class="codes-wrap">
      <span class="bold">Коды</span>
      <table class="codes">
        <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </table>
    </div>
    <div class="title-block">
      <div class="form-name">Типовая межведомственная форма №1-т</div>
      <div class="doc-title">ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ №${plumbLog.id}</div>
      <div class="doc-date">${docDate}</div>
    </div>
  </div>

  <div class="auto-line">
    <span>Автомобиль</span><span class="ul">${plate}</span>
  </div>

  <table class="fields">
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Автопредприятие</span><span class="ul">${carrier}</span>
          <span class="lbl" style="padding-left:8px">Водитель</span><span class="ul">${driverName}</span>
          <span class="lbl" style="padding-left:8px">Вид перевозки</span><span class="ul">${deliveryType}</span>
        </div>
      </td>
      <td class="rlbl">к путевому листу №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Заказчик (плательщик)</span><span class="ul"></span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Грузоотправитель</span><span class="ul">${supplier}</span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline"><span class="lbl">Грузополучатель</span><span class="ul">${recipient}</span></div></td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Пункт погрузки</span><span class="ul">${bsuName}</span>
          <span class="lbl" style="padding-left:8px">Пункт разгрузки</span><span class="ul"></span>
        </div>
      </td>
      <td class="rlbl">код</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span class="lbl">Переадресовка</span><span class="ul"></span>
          <span class="lbl" style="padding-left:8px">1.Прицеп</span><span class="ul" style="flex:0 0 280px"></span>
        </div>
      </td>
      <td class="rlbl">Маршрут №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td>
        <div class="fline">
          <span style="flex:1 1 auto"></span>
          <span class="lbl">2.Прицеп</span><span class="ul" style="flex:0 0 280px"></span>
        </div>
      </td>
      <td class="rlbl">Гар. №</td>
      <td class="rbx"></td>
    </tr>
    <tr>
      <td><div class="fline">&nbsp;</div></td>
      <td class="rlbl">Гар. №</td>
      <td class="rbx"></td>
    </tr>
  </table>

  <div class="section-title">Сведения о грузе</div>
  <table class="grid">
    <tr>
      <th style="width:52px">Номенк № код</th>
      <th style="width:52px">№ прейск позиция</th>
      <th>Наименование продукции товара (груза) или номера контейнера</th>
      <th style="width:40px">Един. измер</th>
      <th style="width:58px">Количество</th>
      <th style="width:32px">Цена</th>
      <th style="width:40px">Сумма</th>
      <th style="width:88px">С грузом следуют документы</th>
      <th style="width:42px">Вид упаков</th>
      <th style="width:44px">объем м3</th>
      <th style="width:70px">Способы опред массы</th>
      <th style="width:38px">Код груза</th>
      <th style="width:54px">Масса тары, т</th>
      <th style="width:58px">Масса брутто, т</th>
    </tr>
    <tr>
      <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td>
      <td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td>
    </tr>
    <tr class="data">
      <td></td><td></td>
      <td>${material}</td>
      <td>Т</td>
      <td>${quantityTons}</td>
      <td></td><td></td><td></td><td></td>
      <td>${volumeStr}</td>
      <td></td><td></td>
      <td>${tareTons}</td>
      <td>${grossTons}</td>
    </tr>
  </table>

  <div class="row2" style="margin-top:3px">
    <div>Всего получено на сумму <span class="ul" style="min-width:220px"></span></div>
    <div>Отпуск разрешил <span class="ul bold" style="min-width:240px">${operator}</span></div>
  </div>

  <table class="sigtable">
    <tr>
      <td>
        <div class="sline row2"><span>Указанный груз за испр. <span class="ul bold" style="min-width:80px">${seal}</span></span><span>Кол. <span class="ul" style="min-width:60px"></span></span></div>
        <div class="sline row2"><span>пломбой, тарой и упаковкой</span><span>мест</span></div>
        <div class="sline">Массой брутто, т <span class="bold">${grossTons3}</span> к перевозке</div>
        <div class="sline" style="margin-top:8px"><span class="bold">Сдал</span> <span class="ul" style="min-width:150px">${operator}</span></div>
        <div class="sline"><span class="italic">Принял водит-экспедитор</span> <span class="ul italic" style="min-width:100px">${driverName}</span></div>
      </td>
      <td>
        <div class="sline row2"><span>Указанный груз за испр. <span class="ul bold" style="min-width:80px">${seal}</span></span><span>Кол. <span class="ul" style="min-width:60px"></span></span></div>
        <div class="sline row2"><span>пломбой, тарой и упаковкой</span><span>мест</span></div>
        <div class="sline">Массой брутто, т <span class="bold">${grossTons3}</span> к перевозке</div>
        <div class="sline" style="margin-top:8px"><span class="italic">Сдал водитель-экспедитор</span> <span class="ul italic" style="min-width:110px">${driverName}</span></div>
        <div class="sline">Принял <span class="ul" style="min-width:160px"></span></div>
      </td>
      <td class="dov">
        <div class="sline">По доверенности № <span class="ul" style="min-width:110px"></span></div>
        <div class="sline">выданной <span class="ul" style="min-width:150px"></span></div>
        <div class="sline">Груз получил <span class="ul" style="min-width:130px"></span></div>
        <div class="sline"><span class="ul" style="min-width:200px">&nbsp;</span></div>
        <div class="sline">Транспортные услуги <span class="ul" style="min-width:100px"></span></div>
        <div class="sline"><span class="ul" style="min-width:200px">&nbsp;</span></div>
        <div class="sline">Отметки о сост актах <span class="ul" style="min-width:100px"></span></div>
      </td>
    </tr>
  </table>

  <div class="section-title">Погрузочно-разгрузочные операции</div>
  <table class="grid">
    <tr>
      <th rowspan="2" style="width:70px">операции</th>
      <th rowspan="2" style="width:90px">исп АТП, отпр получ</th>
      <th rowspan="2" colspan="2">способ руче,мех,груз</th>
      <th colspan="3">время, час. мин</th>
      <th colspan="2">дополнительные операции</th>
      <th rowspan="2" style="width:90px">отв лицо подпись</th>
    </tr>
    <tr>
      <th>прибытия</th><th>убытия</th><th>простой</th>
      <th>время, мин</th><th>наименов, колич</th>
    </tr>
    <tr>
      <td></td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td><td>20</td><td>21</td><td>22</td><td>23</td>
    </tr>
    <tr>
      <td>погр</td>
      <td></td><td></td><td></td>
      <td>${firstTime}</td>
      <td>${secondTime}</td>
      <td></td><td></td><td></td>
      <td>80</td>
    </tr>
    <tr>
      <td>рагр</td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>

  <div class="section-title">Прочие сведения (заполняется организацией, владельцем автотранспорта)</div>
  <table class="grid">
    <tr>
      <th colspan="5">Расст перевоза по группам дорог, км</th>
      <th rowspan="2">Код эксп</th>
      <th colspan="2">За трансп услуги</th>
      <th colspan="2">Поправочн коэф</th>
      <th rowspan="2">штраф</th>
      <th rowspan="2"></th>
      <th rowspan="2"></th>
    </tr>
    <tr>
      <th>всего</th><th>в гор</th><th>I гр.</th><th>II гр.</th><th>III гр.</th>
      <th>с клиента</th><th>водителю</th><th>расцводит.</th><th>основн тариф</th>
    </tr>
    <tr>
      <td>24</td><td>25</td><td>26</td><td>27</td><td>28</td><td>29</td>
      <td>30</td><td>31</td><td>32</td><td>33</td><td>34</td><td>35</td><td>36</td>
    </tr>
    <tr>
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>

</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    toast.error("Не удалось открыть окно печати. Разрешите всплывающие окна.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

// Акт взвешивания — для отвесов сырья (без привязки к заявке). Две копии на странице.
function printAct(plumbLog: PlumbLog) {
  const formatDT = (dt: string | null | undefined) => {
    if (!dt) return "—";
    return new Intl.DateTimeFormat("ru-KZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dt));
  };
  const monitoring = getMonitoringDisplay(plumbLog);

  const actHtml = (copy: number) => `
    <div class="act"${copy === 2 ? ' style="margin-top:32px;padding-top:24px;border-top:1px dashed #000;"' : ""}>
      <h3>Акт взвешивания №${plumbLog.id}</h3>
      <p>Поставщик: ${plumbLog.supplier?.name ?? "—"}</p>
      <p>Заказчик: ${plumbLog.customer?.name ?? "—"}</p>
      <p>Гос.номер: ${plumbLog.transport?.plateNumber ?? "—"}</p>
      <p>Водитель: ${plumbLog.driver?.fullName ?? "—"}</p>
      <p>Материал: ${plumbLog.material?.name ?? "—"}</p>
      <p>Перевозчик: ${plumbLog.carrier?.name ?? "—"}</p>
      <p style="margin-top:12px;font-weight:bold;">Данные по весу:</p>
      <table>
        <thead>
          <tr>
            <th>Брутто, кг</th><th>Тара, кг</th><th>Нетто, кг</th>
            <th>Номер силоса</th><th>Кол-во мешков</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${plumbLog.gross ?? "—"}</td>
            <td>${plumbLog.tare ?? "—"}</td>
            <td>${plumbLog.net ?? "—"}</td>
            <td>—</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
      <table style="margin-top:8px;">
        <tbody>
          <tr>
            <th></th>
            <th>Первое взвешивание</th>
            <th>Второе взвешивание</th>
          </tr>
          <tr>
            <td>Оператор</td>
            <td>${monitoring.firstOperator?.fullName ?? "—"}</td>
            <td>${monitoring.secondOperator?.fullName ?? "—"}</td>
          </tr>
          <tr>
            <td>Дата и время</td>
            <td>${formatDT(monitoring.firstAt)}</td>
            <td>${formatDT(monitoring.secondAt)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Акт взвешивания №${plumbLog.id}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; background: #fff; }
    h3 { margin: 0 0 8px; font-size: 14px; font-weight: bold; }
    p { margin: 2px 0; }
    table { border-collapse: collapse; width: 100%; margin-top: 4px; }
    th, td { border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 11px; }
    th { background: #f0f0f0; font-weight: bold; }
    @media print { body { margin: 0; } @page { size: A4 portrait; margin: 10mm; } }
  </style>
</head>
<body>
  ${actHtml(1)}
  ${actHtml(2)}
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    toast.error("Не удалось открыть окно печати. Разрешите всплывающие окна.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
      {children}
    </h3>
  );
}

function ReadonlyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="h-9 rounded-md border border-border bg-muted/20 px-3 flex items-center text-sm text-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

// Поле в режиме просмотра — просто текст (визуально отличается от редактируемого поля)
function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="h-9 flex items-center text-sm text-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

// Поле, которое нельзя редактировать даже в режиме редактирования (привязано к заявке)
function LockedField({
  label,
  value,
  editing,
}: {
  label: string;
  value: string;
  editing: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
        {label}
        {editing && <Lock className="h-3 w-3 text-muted-foreground/60" />}
      </Label>
      <div className="h-9 flex items-center text-sm text-foreground">
        {value || "—"}
      </div>
      {editing && (
        <p className="text-xs text-muted-foreground/60">не редактируется</p>
      )}
    </div>
  );
}

const fmtDmy = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

// Диалог «Изменить привязку»: заявки за дату отвеса + поиск по ID
function ChangeApplicationDialog({
  plumbLog,
  onClose,
}: {
  plumbLog: PlumbLog;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const monitoring = getMonitoringDisplay(plumbLog);
  const plumbDate = monitoring.firstAt?.slice(0, 10) ?? "";
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<
    Application | null | "not_found"
  >(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: dayApps = [], isLoading: dayLoading } = useQuery({
    queryKey: ["applications", { deliveryDate: plumbDate, isActive: true }],
    queryFn: () => getApplications({ deliveryDate: plumbDate, isActive: true }),
    enabled: !!plumbDate,
  });

  // Поиск по ID с debounce 400ms
  useEffect(() => {
    if (!searchId) {
      setSearchResult(null);
      return;
    }
    const id = parseInt(searchId, 10);
    if (isNaN(id)) return;
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResult(await getApplicationById(id));
      } catch {
        setSearchResult("not_found");
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchId]);

  const bindMutation = useMutation({
    mutationFn: (applicationId: number) =>
      updatePlumbLog(plumbLog.id, { applicationId }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: plumbLogKeys.detail(plumbLog.id),
      });
      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      if (plumbLog.applicationId != null) {
        queryClient.invalidateQueries({
          queryKey: applicationKeys.detail(plumbLog.applicationId),
        });
      }
      if (updated.applicationId != null) {
        queryClient.invalidateQueries({
          queryKey: applicationKeys.detail(updated.applicationId),
        });
      }
      toast.success("Привязка обновлена");
      onClose();
    },
    onError: () => toast.error("Ошибка изменения привязки"),
  });

  const rows: Application[] = searchId
    ? searchResult && searchResult !== "not_found"
      ? [searchResult]
      : []
    : sortBindingApplications(dayApps);
  const showLoading = searchId ? isSearching : dayLoading;
  const showNotFound =
    !!searchId && searchResult === "not_found" && !isSearching;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Изменить привязку</DialogTitle>
          <DialogDescription>
            Заявки за {fmtDmy(monitoring.firstAt)} или введите ID для поиска
          </DialogDescription>
        </DialogHeader>

        <Input
          type="number"
          placeholder="Поиск по ID заявки..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="bg-background-elevated border-border"
        />

        <div className="max-h-[360px] overflow-y-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {["ID", "Статус", "Заказчик", "Объект", "МБ", "Куб."].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    <Loader2 className="inline h-4 w-4 animate-spin" />
                  </td>
                </tr>
              ) : showNotFound ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Заявка не найдена
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Заявок нет
                  </td>
                </tr>
              ) : (
                rows.map((app) => {
                  const status = getBindingStatus(app);
                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "border-b border-border/50 cursor-pointer hover:bg-primary/5 transition-colors",
                        app.id === plumbLog.applicationId && "bg-primary/10",
                      )}
                      onClick={() => bindMutation.mutate(app.id)}
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {app.id}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">{app.customer?.name ?? "—"}</td>
                      <td className="px-3 py-2">{app.object?.name ?? "—"}</td>
                      <td className="px-3 py-2">{app.material?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        {app.targetVolume != null
                          ? app.targetVolume.toFixed(2)
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DetailProps {
  id: number;
  plumbLog: PlumbLog;
  isConcrete: boolean;
  backUrl: string;
  backLabel: string;
  suppliers: Awaited<ReturnType<typeof getCompanies>>;
  customers: Awaited<ReturnType<typeof getCompanies>>;
  materials: Awaited<ReturnType<typeof getMaterials>>;
  transports: Awaited<ReturnType<typeof getTransports>>;
  drivers: Awaited<ReturnType<typeof getDrivers>>;
  bsuList: Awaited<ReturnType<typeof getBsuList>>;
  constructions: Awaited<ReturnType<typeof getConstructions>>;
  nomenclatures: Awaited<ReturnType<typeof getNomenclatures>>;
  objects: Awaited<ReturnType<typeof getObjects>>;
  carriers: Awaited<ReturnType<typeof getCarriers>>;
}

export function PlumbLogView({
  id,
  backUrl = "/plumb",
  backLabel = "Журнал отвесов",
}: Props) {
  const { data: plumbLog, isLoading } = useQuery({
    queryKey: plumbLogKeys.detail(id),
    queryFn: () => getPlumbLogById(id),
    enabled: !!id,
  });

  const isConcrete =
    plumbLog?.applicationId !== null && plumbLog?.applicationId !== undefined;

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["companies", { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  });

  // В режиме просмотра — все активные компании (без фильтра по function)
  const customers = suppliers;

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["materials", { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
  });

  const { data: transports = [], isLoading: transportsLoading } = useQuery({
    queryKey: ["transports", { isActive: true }],
    queryFn: () => getTransports({ isActive: true }),
    staleTime: 60_000,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["drivers", { isActive: true }],
    queryFn: () => getDrivers({ isActive: true }),
    staleTime: 60_000,
  });

  // Все активные БСУ — фильтр по companyId возвращал пусто (companyId БСУ ≠ supplierId заявки)
  const { data: bsuList = [], isLoading: bsuLoading } = useQuery({
    queryKey: ["bsu", { isActive: true }],
    queryFn: () => getBsuList({ isActive: true }),
    enabled: isConcrete,
    staleTime: 60_000,
  });

  const { data: objects = [], isLoading: objectsLoading } = useQuery({
    queryKey: ["objects", { isActive: true }],
    queryFn: () => getObjects({ isActive: true }),
    staleTime: 60_000,
  });

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["carriers", { isActive: true }],
    queryFn: () => getCarriers({ isActive: true }),
    staleTime: 60_000,
  });

  const { data: constructions = [], isLoading: constructionsLoading } =
    useQuery({
      queryKey: ["constructions", { isActive: true }],
      queryFn: () => getConstructions({ isActive: true }),
      staleTime: 60_000,
      enabled: isConcrete,
    });

  const { data: nomenclatures = [], isLoading: nomenclaturesLoading } =
    useQuery({
      queryKey: ["nomenclatures", { isActive: true }],
      queryFn: () => getNomenclatures({ isActive: true }),
      staleTime: 60_000,
      enabled: !isConcrete,
    });

  // Ждём загрузки ВСЕХ нужных списков, чтобы Select сразу показывал labels
  const concreteLists = isConcrete ? bsuLoading || constructionsLoading : false;
  const rawLists = !isConcrete && !!plumbLog ? nomenclaturesLoading : false;
  const listsLoading =
    suppliersLoading ||
    materialsLoading ||
    transportsLoading ||
    driversLoading ||
    objectsLoading ||
    carriersLoading ||
    concreteLists ||
    rawLists;

  if (isLoading || !plumbLog || listsLoading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // key={plumbLog.id}: дочерний компонент монтируется заново при смене отвеса, и его
  // useForm берёт свежие defaultValues. defaultValues + gated render — тот же рабочий
  // паттерн, что в ApplicationForm (values/reset/setValue до полей здесь не доходили).
  return (
    <PlumbLogDetail
      key={plumbLog.id}
      id={id}
      plumbLog={plumbLog}
      isConcrete={isConcrete}
      backUrl={backUrl}
      backLabel={backLabel}
      suppliers={suppliers}
      customers={customers}
      materials={materials}
      transports={transports}
      drivers={drivers}
      bsuList={bsuList}
      constructions={constructions}
      nomenclatures={nomenclatures}
      objects={objects}
      carriers={carriers}
    />
  );
}

function PlumbLogDetail({
  id,
  plumbLog,
  isConcrete,
  backUrl,
  backLabel,
  suppliers,
  customers,
  materials,
  transports,
  drivers,
  bsuList,
  constructions,
  nomenclatures,
  objects,
  carriers,
}: DetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [tareInput, setTareInput] = useState(
    plumbLog.tare != null ? String(plumbLog.tare) : "",
  );
  const [grossInput, setGrossInput] = useState(
    plumbLog.gross != null ? String(plumbLog.gross) : "",
  );
  const { weight, isConnected } = useScaleStore();

  const defaultValues = {
    supplierId: plumbLog.supplierId,
    customerId: plumbLog.customerId,
    materialId: plumbLog.materialId,
    objectId: plumbLog.objectId ?? undefined,
    transportId: plumbLog.transportId ?? undefined,
    driverId: plumbLog.driverId ?? undefined,
    carrierId: plumbLog.carrierId ?? undefined,
    bsuId: plumbLog.bsuId ?? undefined,
    constructionId: plumbLog.constructionId ?? undefined,
    nomenclatureId: plumbLog.nomenclatureId ?? undefined,
    volume: plumbLog.volume ?? null,
    returnVolume: plumbLog.returnVolume ?? null,
    sealNumber: plumbLog.sealNumber ?? undefined,
    slumpCone: plumbLog.slumpCone ?? undefined,
    deliveryType: plumbLog.deliveryType ?? undefined,
    impurity: plumbLog.impurity ?? undefined,
    cleanNet: plumbLog.cleanNet ?? undefined,
    documentWeight: plumbLog.documentWeight ?? undefined,
    firstWeighingAt: plumbLog.firstWeighingAt ?? undefined,
    secondWeighingAt: plumbLog.secondWeighingAt ?? undefined,
  } satisfies UpdatePlumbLogDto;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<UpdatePlumbLogDto>({ defaultValues });

  const customerId = useWatch({ control, name: "customerId" });
  const prevCustomerIdRef = useRef(customerId);

  useEffect(() => {
    if (
      prevCustomerIdRef.current !== customerId &&
      prevCustomerIdRef.current !== undefined
    ) {
      setValue("objectId", undefined);
    }
    prevCustomerIdRef.current = customerId;
  }, [customerId, setValue]);

  const loadSuppliers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCompanies({ isActive: true, search }).then((list) =>
        list.map((c) => ({ id: c.id, label: c.name })),
      ),
    [],
  );

  const loadCustomers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCompanies({ isActive: true, function: "OWN", search }).then((list) =>
        list.map((c) => ({ id: c.id, label: c.name })),
      ),
    [],
  );

  const loadMaterials = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getMaterials({ isActive: true, filterType: "OTHER", search }).then(
        (list) => list.map((m) => ({ id: m.id, label: m.name })),
      ),
    [],
  );

  const loadObjects = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      customerId
        ? getObjects({ companyId: customerId, isActive: true, search }).then(
            (list) => list.map((o) => ({ id: o.id, label: o.name })),
          )
        : Promise.resolve([]),
    [customerId],
  );

  const selectedTransport = transports.find(
    (t) => t.id === plumbLog.transportId,
  );

  // Разрешённые значения для отображения в режиме просмотра
  const supplierName =
    suppliers.find((c) => c.id === plumbLog.supplierId)?.name ?? "—";
  const customerName =
    customers.find((c) => c.id === plumbLog.customerId)?.name ?? "—";
  const materialName =
    materials.find((m) => m.id === plumbLog.materialId)?.name ?? "—";
  const driverName =
    drivers.find((d) => d.id === plumbLog.driverId)?.fullName ?? "—";
  const transportPlate =
    transports.find((t) => t.id === plumbLog.transportId)?.plateNumber ?? "—";
  const bsuName = bsuList.find((b) => b.id === plumbLog.bsuId)?.name ?? "—";
  const constructionName =
    constructions.find((c) => c.id === plumbLog.constructionId)?.name ?? "—";
  const nomenclatureName =
    nomenclatures.find((n) => n.id === plumbLog.nomenclatureId)?.name ?? "—";
  const objectName =
    objects.find((o) => o.id === plumbLog.objectId)?.name ??
    plumbLog.object?.name ??
    "—";
  const carrierName =
    carriers.find((c) => c.id === plumbLog.carrierId)?.name ??
    selectedTransport?.carrier?.name ??
    plumbLog.carrier?.name ??
    "—";
  const monitoring = getMonitoringDisplay(plumbLog);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: plumbLogKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() });
  };

  // Нетто по введённым значениям (для предпросмотра)
  const tareNum = tareInput ? Number(tareInput) : null;
  const grossNum = grossInput ? Number(grossInput) : null;
  const grossInvalid =
    grossNum != null && tareNum != null && grossNum <= tareNum;
  const netPreview =
    grossNum != null && tareNum != null && !grossInvalid
      ? grossNum - tareNum
      : null;

  // isSaving — единый флаг для кнопки Сохранить всей формы
  const [isSaving, setIsSaving] = useState(false);

  const weighTareMutation = useMutation({
    mutationFn: (value: number) => weighTare(id, value),
    onSuccess: () => {
      invalidate();
      toast.success("Тара сохранена");
    },
    onError: (e: any) => toast.error(e?.message || "Ошибка сохранения тары"),
  });

  const weighGrossMutation = useMutation({
    mutationFn: (value: number) => weighGross(id, value),
    onSuccess: () => {
      invalidate();
      toast.success("Брутто сохранено");
    },
    onError: (e: any) => toast.error(e?.message || "Ошибка сохранения брутто"),
  });

  const handleCancel = () => {
    reset(defaultValues);
    setTareInput(plumbLog.tare != null ? String(plumbLog.tare) : "");
    setGrossInput(plumbLog.gross != null ? String(plumbLog.gross) : "");
    setIsEditing(false);
  };

  // Сохранение: последовательно weighTare → weighGross (если изменились) → updatePlumbLog
  const handleSave = handleSubmit(async (data) => {
    setIsSaving(true);
    try {
      const newTare = tareNum;
      const newGross = grossNum;

      if (newTare !== null && newTare !== plumbLog.tare) {
        await weighTare(id, newTare);
      }
      if (newGross !== null && newGross !== plumbLog.gross) {
        if (grossInvalid) {
          toast.error("Брутто должно быть больше тары");
          return;
        }
        await weighGross(id, newGross);
      }

      const patch: UpdatePlumbLogDto = { ...data };
      if (!dirtyFields.firstWeighingAt) delete patch.firstWeighingAt;
      if (!dirtyFields.secondWeighingAt) delete patch.secondWeighingAt;

      await updatePlumbLog(id, patch);
      invalidate();
      setIsEditing(false);
      toast.success("Сохранено");
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  });

  const returnMutation = useMutation({
    mutationFn: () => createReturn(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() });
      toast.success("Возврат создан");
      router.push("/plumb/view/" + data.id);
    },
    onError: () => toast.error("Ошибка создания возврата"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivatePlumbLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() });
      toast.success("Отвес деактивирован");
      router.push("/plumb");
    },
  });

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push(backUrl)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Отвес ID: {id}
              {plumbLog.isReturn && (
                <span className="ml-2 text-sm font-normal text-warning bg-warning/10 rounded px-2 py-0.5">
                  Возврат
                </span>
              )}
              {!plumbLog.isActive && (
                <span className="ml-2 text-sm font-normal text-destructive bg-destructive/10 rounded px-2 py-0.5">
                  Неактивен
                </span>
              )}
              {isEditing && (
                <span className="ml-2 text-sm font-normal text-primary bg-primary/10 rounded px-2 py-0.5">
                  Редактирование
                </span>
              )}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {fmt(monitoring.firstAt)}
            </p>
          </div>

          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Отмена
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Редактировать
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => printTTN(plumbLog)}
              >
                <Printer className="h-4 w-4" />
                Распечатать ТТН
              </Button>
              {!isConcrete && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => printAct(plumbLog)}
                >
                  <FileText className="h-4 w-4" />
                  Распечатать акт
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowBindDialog(true)}
              >
                <Link2 className="h-4 w-4" />
                Изменить привязку
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={returnMutation.isPending}
                onClick={() => {
                  if (window.confirm("Создать возврат для этого отвеса?")) {
                    returnMutation.mutate();
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Возврат
              </Button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Колонка 1: Общие данные */}
            <div className="space-y-4">
              <SectionTitle>Общие данные</SectionTitle>

              {/* Поставщик / Заказчик / Материал / Объект */}
              {isConcrete ? (
                <>
                  <LockedField
                    label="Поставщик"
                    value={supplierName}
                    editing={isEditing}
                  />
                  <LockedField
                    label="Заказчик"
                    value={customerName}
                    editing={isEditing}
                  />
                  <LockedField
                    label="Материал"
                    value={materialName}
                    editing={isEditing}
                  />
                  <LockedField
                    label="Объект"
                    value={objectName}
                    editing={isEditing}
                  />
                </>
              ) : isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Поставщик
                    </Label>
                    <Controller
                      name="supplierId"
                      control={control}
                      rules={{ required: "Обязательное поле" }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? "empty-supplier"}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadSuppliers}
                          placeholder="Выберите поставщика"
                        />
                      )}
                    />
                    {errors.supplierId && (
                      <p className="text-xs text-destructive">
                        {errors.supplierId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Заказчик
                    </Label>
                    <Controller
                      name="customerId"
                      control={control}
                      rules={{ required: "Обязательное поле" }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? "empty-customer"}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadCustomers}
                          placeholder="Выберите заказчика"
                        />
                      )}
                    />
                    {errors.customerId && (
                      <p className="text-xs text-destructive">
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Материал
                    </Label>
                    <Controller
                      name="materialId"
                      control={control}
                      rules={{ required: "Обязательное поле" }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? "empty-material"}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadMaterials}
                          placeholder="Выберите материал"
                        />
                      )}
                    />
                    {errors.materialId && (
                      <p className="text-xs text-destructive">
                        {errors.materialId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Объект
                    </Label>
                    <Controller
                      name="objectId"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          key={`${customerId ?? "none"}-${field.value ?? "empty-object"}`}
                          value={field.value ?? undefined}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadObjects}
                          disabled={!customerId}
                          placeholder={
                            !customerId
                              ? "Сначала выберите заказчика"
                              : "Выберите объект"
                          }
                        />
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ViewField label="Поставщик" value={supplierName} />
                  <ViewField label="Заказчик" value={customerName} />
                  <ViewField label="Материал" value={materialName} />
                  <ViewField label="Объект" value={objectName} />
                </>
              )}

              {isConcrete ? (
                isEditing ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Объём (м³)
                      </Label>
                      <Controller
                        name="volume"
                        control={control}
                        rules={{
                          validate: (value) => {
                            if (value == null) return "Обязательное поле";
                            if (value <= 0) return "Введите число больше 0";
                            return true;
                          },
                        }}
                        render={({ field }) => (
                          <DecimalInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      {errors.volume && (
                        <p className="text-xs text-destructive">
                          {errors.volume.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Объём возврата (м³)
                      </Label>
                      <Controller
                        name="returnVolume"
                        control={control}
                        render={({ field }) => (
                          <DecimalInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Номер пломбы
                      </Label>
                      <Controller
                        name="sealNumber"
                        control={control}
                        render={({ field }) => (
                          <Input
                            className="bg-background-elevated border-border h-9"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value || undefined)
                            }
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Осадка конуса (см)
                      </Label>
                      <Controller
                        name="slumpCone"
                        control={control}
                        rules={{
                          validate: (v) =>
                            isValidSlumpCone(v) ||
                            "Число «22» или диапазон «22-23»",
                        }}
                        render={({ field }) => (
                          <Input
                            className="bg-background-elevated border-border h-9"
                            placeholder="напр. 22 или 22-23"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value || undefined)
                            }
                          />
                        )}
                      />
                      {errors.slumpCone && (
                        <p className="text-xs text-destructive">
                          {errors.slumpCone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Тип перевозки
                      </Label>
                      <Controller
                        name="deliveryType"
                        control={control}
                        render={({ field }) => (
                          <Input
                            className="bg-background-elevated border-border h-9"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value || undefined)
                            }
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        Конструкция
                      </Label>
                      <Controller
                        name="constructionId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : "none"}
                            onValueChange={(v) =>
                              field.onChange(
                                v === "none" ? undefined : Number(v),
                              )
                            }
                          >
                            <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                              <SelectValue placeholder="Не выбрана" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Не выбрана</SelectItem>
                              {constructions.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ViewField
                      label="Объём (м³)"
                      value={
                        plumbLog.volume != null ? String(plumbLog.volume) : "—"
                      }
                    />
                    <ViewField
                      label="Объём возврата (м³)"
                      value={
                        plumbLog.returnVolume != null
                          ? String(plumbLog.returnVolume)
                          : "—"
                      }
                    />
                    <ViewField
                      label="Номер пломбы"
                      value={plumbLog.sealNumber ?? "—"}
                    />
                    <ViewField
                      label="Осадка конуса (см)"
                      value={
                        plumbLog.slumpCone != null
                          ? String(plumbLog.slumpCone)
                          : "—"
                      }
                    />
                    <ViewField
                      label="Тип перевозки"
                      value={plumbLog.deliveryType ?? "—"}
                    />
                    <ViewField label="Конструкция" value={constructionName} />
                  </>
                )
              ) : isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Номенклатура
                    </Label>
                    <Controller
                      name="nomenclatureId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? undefined : Number(v))
                          }
                        >
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Не выбрана" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {nomenclatures.map((n) => (
                              <SelectItem key={n.id} value={String(n.id)}>
                                {n.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Сорность (%)
                    </Label>
                    <Controller
                      name="impurity"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-background-elevated border-border h-9"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Чистый нетто (кг)
                    </Label>
                    <Controller
                      name="cleanNet"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="bg-background-elevated border-border h-9"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Вес по документам (кг)
                    </Label>
                    <Controller
                      name="documentWeight"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="bg-background-elevated border-border h-9"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ViewField label="Номенклатура" value={nomenclatureName} />
                  <ViewField
                    label="Сорность (%)"
                    value={
                      plumbLog.impurity != null
                        ? String(plumbLog.impurity)
                        : "—"
                    }
                  />
                  <ViewField
                    label="Чистый нетто (кг)"
                    value={
                      plumbLog.cleanNet != null
                        ? plumbLog.cleanNet.toLocaleString("ru-RU")
                        : "—"
                    }
                  />
                  <ViewField
                    label="Вес по документам (кг)"
                    value={
                      plumbLog.documentWeight != null
                        ? plumbLog.documentWeight.toLocaleString("ru-RU")
                        : "—"
                    }
                  />
                </>
              )}
            </div>

            {/* Колонка 2: Транспорт */}
            <div className="space-y-4">
              <SectionTitle>Данные по транспорту</SectionTitle>

              {isEditing ? (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    Водитель
                  </Label>
                  <Controller
                    name="driverId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : "none"}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? undefined : Number(v))
                        }
                      >
                        <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                          <SelectValue placeholder="Не выбран" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбран</SelectItem>
                          {drivers.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : (
                <ViewField label="Водитель" value={driverName} />
              )}

              {isEditing ? (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    Перевозчик
                  </Label>
                  <Controller
                    name="carrierId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : "none"}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? undefined : Number(v))
                        }
                      >
                        <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                          <SelectValue placeholder="Не выбран" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбран</SelectItem>
                          {carriers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : (
                <ViewField label="Перевозчик" value={carrierName} />
              )}

              {isEditing ? (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    Гос. номер
                  </Label>
                  <Controller
                    name="transportId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                          <SelectValue placeholder="Выберите транспорт" />
                        </SelectTrigger>
                        <SelectContent>
                          {transports.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.plateNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : (
                <ViewField label="Гос. номер" value={transportPlate} />
              )}

              {isConcrete &&
                (isEditing ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">БСУ</Label>
                    <Controller
                      name="bsuId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? undefined : Number(v))
                          }
                        >
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Не выбран" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {bsuList.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                ) : (
                  <ViewField label="БСУ" value={bsuName} />
                ))}
            </div>

            {/* Колонка 3: Мониторинг + Вес */}
            <div className="space-y-6">
              <div>
                <SectionTitle>Данные по мониторингу</SectionTitle>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {isEditing ? (
                      isConcrete ? (
                        plumbLog.tare != null ? (
                          <Controller
                            name="firstWeighingAt"
                            control={control}
                            render={({ field }) => (
                              <DateTimePickerField
                                label="Первое взвешивание"
                                value={field.value ?? plumbLog.firstWeighingAt}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        ) : (
                          <ReadonlyVal
                            label="Первое взвешивание"
                            value={fmt(monitoring.firstAt)}
                          />
                        )
                      ) : plumbLog.gross != null ? (
                        <Controller
                          name="secondWeighingAt"
                          control={control}
                          render={({ field }) => (
                            <DateTimePickerField
                              label="Первое взвешивание"
                              value={field.value ?? plumbLog.secondWeighingAt}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      ) : (
                        <ReadonlyVal
                          label="Первое взвешивание"
                          value={fmt(monitoring.firstAt)}
                        />
                      )
                    ) : (
                      <ReadonlyVal
                        label="Первое взвешивание"
                        value={fmt(monitoring.firstAt)}
                      />
                    )}
                    <ReadonlyVal
                      label="Оператор"
                      value={monitoring.firstOperator?.fullName ?? "—"}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {isEditing ? (
                      isConcrete ? (
                        plumbLog.gross != null ? (
                          <Controller
                            name="secondWeighingAt"
                            control={control}
                            render={({ field }) => (
                              <DateTimePickerField
                                label="Второе взвешивание"
                                value={field.value ?? plumbLog.secondWeighingAt}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        ) : (
                          <ReadonlyVal
                            label="Второе взвешивание"
                            value={fmt(monitoring.secondAt)}
                          />
                        )
                      ) : plumbLog.tare != null ? (
                        <Controller
                          name="firstWeighingAt"
                          control={control}
                          render={({ field }) => (
                            <DateTimePickerField
                              label="Второе взвешивание"
                              value={field.value ?? plumbLog.firstWeighingAt}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      ) : (
                        <ReadonlyVal
                          label="Второе взвешивание"
                          value={fmt(monitoring.secondAt)}
                        />
                      )
                    ) : (
                      <ReadonlyVal
                        label="Второе взвешивание"
                        value={fmt(monitoring.secondAt)}
                      />
                    )}
                    <ReadonlyVal
                      label="Оператор"
                      value={monitoring.secondOperator?.fullName ?? "—"}
                    />
                  </div>
                </div>
              </div>

              <div>
                <SectionTitle>Данные по весу</SectionTitle>
                <div className="space-y-3">
                  {/* Тара */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Тара, кг
                      {plumbLog.tare !== null && (
                        <span className="ml-2 text-xs text-success">
                          ✓ сохранена: {plumbLog.tare.toLocaleString("ru-RU")}{" "}
                          кг
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="bg-background-elevated border-border h-9 flex-1"
                        placeholder="введите вручную"
                        value={tareInput}
                        onChange={(e) => setTareInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 whitespace-nowrap gap-1.5"
                        disabled={!isConnected || weight === null}
                        title={isConnected ? `Вставить с весов: ${weight} кг` : "Весы не подключены"}
                        onClick={() => {
                          if (weight !== null) setTareInput(String(weight));
                        }}
                      >
                        С весов
                        {isConnected && weight !== null && (
                          <span className="text-xs text-muted-foreground">({weight})</span>
                        )}
                      </Button>
                      {tareNum !== plumbLog.tare && tareNum !== null && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap"
                          disabled={weighTareMutation.isPending}
                          onClick={() => weighTareMutation.mutate(tareNum)}
                        >
                          {weighTareMutation.isPending ? "..." : "Сохранить тару"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Брутто */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Брутто, кг
                      {plumbLog.gross !== null && (
                        <span className="ml-2 text-xs text-success">
                          ✓ сохранено: {plumbLog.gross.toLocaleString("ru-RU")}{" "}
                          кг
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="bg-background-elevated border-border h-9 flex-1"
                        placeholder="введите вручную"
                        value={grossInput}
                        onChange={(e) => setGrossInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 whitespace-nowrap gap-1.5"
                        disabled={!isConnected || weight === null}
                        title={isConnected ? `Вставить с весов: ${weight} кг` : "Весы не подключены"}
                        onClick={() => {
                          if (weight !== null) setGrossInput(String(weight));
                        }}
                      >
                        С весов
                        {isConnected && weight !== null && (
                          <span className="text-xs text-muted-foreground">({weight})</span>
                        )}
                      </Button>
                      {grossNum !== plumbLog.gross && grossNum !== null && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap"
                          disabled={grossInvalid || weighGrossMutation.isPending}
                          onClick={() => weighGrossMutation.mutate(grossNum)}
                        >
                          {weighGrossMutation.isPending ? "..." : "Сохранить брутто"}
                        </Button>
                      )}
                    </div>
                    {grossInvalid && (
                      <p className="text-xs text-destructive">
                        Брутто должно быть больше тары ({tareNum?.toLocaleString("ru-RU")} кг)
                      </p>
                    )}
                  </div>

                  {/* Нетто — предпросмотр */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">
                      Нетто, кг
                    </Label>
                    <div className="h-10 rounded-md border border-primary/20 bg-primary/10 px-4 flex items-center">
                      <span className="text-base font-semibold text-primary">
                        {netPreview != null
                          ? netPreview.toLocaleString("ru-RU")
                          : plumbLog.net != null
                            ? plumbLog.net.toLocaleString("ru-RU")
                            : "—"}
                      </span>
                      {netPreview != null && plumbLog.net !== netPreview && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (предпросмотр)
                        </span>
                      )}
                    </div>
                  </div>

                  {plumbLog.cleanNet != null && (
                    <ReadonlyVal
                      label="Чистый вес, кг"
                      value={plumbLog.cleanNet.toLocaleString("ru-RU")}
                    />
                  )}

                  {/* Статус весов */}
                  {isConnected ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-block h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted-foreground">
                        Весы подключены, текущий вес:{" "}
                        <span className="font-medium text-foreground">
                          {weight} кг
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50" />
                      Весы не подключены
                    </div>
                  )}

                  {/* Подсказка */}
                  {(tareNum !== plumbLog.tare || grossNum !== plumbLog.gross) && (
                    <p className="text-xs font-medium text-warning mt-2">
                      ⚠️ У вас есть несохраненные данные веса. Нажмите "Сохранить" рядом с полем, чтобы зафиксировать изменения.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 pt-6 border-t border-border">
        <Button
          variant="outline"
          className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deactivateMutation.isPending}
          onClick={() => {
            if (
              window.confirm(
                "Деактивировать отвес? Это действие нельзя отменить.",
              )
            ) {
              deactivateMutation.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Удалить отвес
        </Button>
      </div>

      {showBindDialog && (
        <ChangeApplicationDialog
          plumbLog={plumbLog}
          onClose={() => setShowBindDialog(false)}
        />
      )}
    </div>
  );
}
