package billing

import "testing"

func TestCalculateUsesInputAndOutputPrices(t *testing.T) {
	cost := Calculate(&Price{InputMicrosPerMillion: 2_000_000, OutputMicrosPerMillion: 6_000_000}, 1000, 500)
	if cost.Micros == nil || *cost.Micros != 5000 || cost.Estimated {
		t.Fatalf("unexpected cost: %+v", cost)
	}
}

func TestMissingPriceIsEstimatedNotHardcodedZero(t *testing.T) {
	cost := Calculate(nil, 100, 100)
	if cost.Micros != nil || !cost.Estimated {
		t.Fatalf("unexpected cost: %+v", cost)
	}
}

func TestPositivePricedUsageRoundsUpToOneMicro(t *testing.T) {
	cost := Calculate(&Price{InputMicrosPerMillion: 1}, 1, 0)
	if cost.Micros == nil || *cost.Micros != 1 {
		t.Fatalf("unexpected cost: %+v", cost)
	}
}
