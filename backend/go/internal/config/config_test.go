package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("NER_DEMO_MODE", "true")
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "5")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if !c.DemoMode || c.Port == "" || c.PythonTimeout <= 0 {
		t.Fatalf("bad defaults %+v", c)
	}
}
func TestLoadRejectsInvalidTimeout(t *testing.T) {
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "zero")
	if _, err := Load(); err == nil {
		t.Fatal("expected error")
	}
}
func TestLiveModeRequiresProviderURLs(t *testing.T) {
	t.Setenv("NER_DEMO_MODE", "false")
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "5")
	t.Setenv("ROUTING_SERVICE_URL", "")
	t.Setenv("WEATHER_SERVICE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error")
	}
}
