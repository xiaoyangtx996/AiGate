package quota

// chargeAgainstLimit returns how many tokens may be recorded as used when settling,
// without allowing used + remaining reserved to exceed the account limit.
func chargeAgainstLimit(actual, limit, used, reservedOnAccount, releaseReserved int64) int64 {
	if actual < 0 {
		actual = 0
	}
	remainingReserved := reservedOnAccount - releaseReserved
	if remainingReserved < 0 {
		remainingReserved = 0
	}
	headroom := limit - used - remainingReserved
	if headroom < 0 {
		headroom = 0
	}
	if actual > headroom {
		return headroom
	}
	return actual
}
