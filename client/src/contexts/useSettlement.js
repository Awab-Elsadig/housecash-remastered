import { useContext } from "react";
import { SettlementContext } from "./SettlementContextDef.js";

export const useSettlement = () => useContext(SettlementContext);
