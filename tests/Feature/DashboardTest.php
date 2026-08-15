<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_visit_the_dashboard()
    {
        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_loads_the_student_record_route()
    {
        $response = $this->get(route('dashboard'));
        $response->assertOk();
        $response->assertSee('data-page');
    }
}
