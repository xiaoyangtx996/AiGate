package billing

type Price struct {
	InputMicrosPerMillion  int64
	OutputMicrosPerMillion int64
}

type Cost struct {
	Micros    *int64
	Estimated bool
}

func Calculate(price *Price, inputTokens, outputTokens int64) Cost {
	if price == nil {
		return Cost{Estimated: true}
	}
	numerator := inputTokens*price.InputMicrosPerMillion + outputTokens*price.OutputMicrosPerMillion
	micros := numerator / 1_000_000
	if numerator > 0 && numerator%1_000_000 != 0 {
		micros++
	}
	return Cost{Micros: &micros}
}
