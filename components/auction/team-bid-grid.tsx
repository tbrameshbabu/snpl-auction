import type {
  BiddingView,
  TeamSummary,
} from "@/components/auction/auction-state";
import { TeamStatusGrid } from "@/components/auction/team-status-grid";

export function TeamBidGrid(props: {
  teams: TeamSummary[];
  bidding: BiddingView;
  bidAmount: number;
  onBid: (team: TeamSummary) => void;
  disabled?: boolean;
}) {
  return <TeamStatusGrid {...props} interactive />;
}
