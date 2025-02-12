import { ApiProperty } from "@nestjs/swagger";

export class NewUser {
    @ApiProperty()
    username: string;

    @ApiProperty()
    password: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;
}
  